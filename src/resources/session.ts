import type { ResolvedClientOptions } from "../types/options";
import type {
  SessionData,
  Recipient,
  AskOptions,
  LogOptions,
  Message,
  ApiMessage,
  PaginatedResponse,
  ApiPaginatedResponse,
} from "../types/api";
import type { Input, ResponseFromInputs } from "../types/inputs";
import {
  WebSocketConnection,
  createWebSocketConnection,
} from "../websocket/connection";
import { BadRequestError, TimeoutError, SessionExpiredError } from "../errors";
import { request } from "../utils/fetch";
import { paginate } from "../pagination";
import { transformMessage } from "../utils/transform";

const DEFAULT_ASK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const SESSION_EXPIRED_CLOSE_CODE = 4001;

/**
 * An active session with methods for interaction.
 *
 * @example
 * ```typescript
 * const session = await client.sessions.create({
 *   name: 'Deploy Review',
 *   recipients: ['user@example.com'],
 * });
 *
 * // Log progress
 * await session.log('Starting deployment...');
 *
 * // Ask with typed inputs (inputs is required)
 * const config = await session.ask('Configure deployment', {
 *   inputs: [
 *     { type: 'select', name: 'env', options: ['staging', 'production'] },
 *     { type: 'confirm', name: 'notify' },
 *   ] as const,
 * });
 * // config: { env: string; notify: boolean }
 *
 * // Cleanup when done
 * session.close();
 * ```
 */
export class Session {
  private connection: WebSocketConnection | null = null;
  private pendingQuestions: Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timeoutId: ReturnType<typeof setTimeout>;
    }
  > = new Map();
  private pendingAcks: Map<
    number,
    {
      resolve: (messageId: string) => void;
      reject: (error: Error) => void;
    }
  > = new Map();
  private ackCounter = 0;

  /**
   * The session ID.
   */
  public readonly id: string;

  /**
   * The session name.
   */
  public readonly name: string;

  /**
   * Recipients associated with this session.
   */
  public readonly recipients: Recipient[];

  /**
   * When the session expires.
   */
  public readonly expiresAt: Date;

  /**
   * @internal
   */
  constructor(
    data: SessionData,
    private readonly options: ResolvedClientOptions
  ) {
    this.id = data.sessionId;
    this.name = data.name;
    this.recipients = data.recipients ?? [];
    this.expiresAt = new Date(data.expiresAt);
  }

  /**
   * Ensures WebSocket connection is established.
   */
  private async ensureConnected(): Promise<WebSocketConnection> {
    if (!this.connection) {
      this.connection = createWebSocketConnection(this.options, this.id);
      this.setupConnectionHandlers();
    }

    await this.connection.connect();
    return this.connection;
  }

  /**
   * Sets up handlers for WebSocket events.
   */
  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    // Handle message acks to get message IDs
    this.connection.on("messageAck", (data) => {
      // Resolve the oldest pending ack (FIFO order)
      if (this.pendingAcks.size > 0) {
        const firstKey = this.pendingAcks.keys().next().value;
        const pending = this.pendingAcks.get(firstKey!);
        if (pending) {
          this.pendingAcks.delete(firstKey!);
          pending.resolve(data.id);
        }
      }
    });

    // Handle message updates (when ask message receives a response)
    // The server sends snake_case data, so transform to camelCase SDK format
    this.connection.on("messageUpdated", (raw: Message) => {
      const message = transformMessage(raw as unknown as ApiMessage);
      if (message.type === "ask" && message.responseContent !== null) {
        this.handleResponse(message);
      }
    });

    // Handle disconnection with session expired code
    this.connection.on("disconnected", (code?: number) => {
      if (code === SESSION_EXPIRED_CLOSE_CODE) {
        // Reject all pending questions
        for (const [, pending] of this.pendingQuestions) {
          clearTimeout(pending.timeoutId);
          pending.reject(new SessionExpiredError());
        }
        this.pendingQuestions.clear();

        // Reject all pending acks
        for (const [, pending] of this.pendingAcks) {
          pending.reject(new SessionExpiredError());
        }
        this.pendingAcks.clear();
      }
    });
  }

  /**
   * Handles a response on an ask message.
   */
  private handleResponse(message: Message): void {
    const pending = this.pendingQuestions.get(message.id);
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    this.pendingQuestions.delete(message.id);

    // Parse structured data from response content
    const responseContent = message.responseContent!;
    try {
      pending.resolve(JSON.parse(responseContent));
    } catch {
      // Content is not JSON, resolve with raw content
      pending.resolve(responseContent);
    }
  }

  /**
   * Send a message and wait for the ack to get the message ID.
   */
  private async sendAndWaitForAck(
    connection: WebSocketConnection,
    payload: Parameters<WebSocketConnection["send"]>[0]
  ): Promise<string> {
    const ackId = ++this.ackCounter;

    return new Promise<string>((resolve, reject) => {
      this.pendingAcks.set(ackId, { resolve, reject });
      connection.send(payload);
    });
  }

  /**
   * Log a message to the session.
   *
   * @param message - Markdown content to log.
   * @param options - Optional settings.
   *
   * @example
   * ```typescript
   * await session.log('**Starting deployment...**');
   * await session.log('Processing file 1 of 10', { persist: false });
   * ```
   */
  async log(message: string, options: LogOptions = {}): Promise<void> {
    const connection = await this.ensureConnected();

    // Wait for ack to keep ack counter in sync with server
    await this.sendAndWaitForAck(connection, {
      role: "agent",
      type: "log",
      content: message,
      persist: options.persist ?? true,
    });
  }

  /**
   * Ask a question with typed inputs and wait for response.
   *
   * @param question - The question to ask.
   * @param options - Options including typed inputs.
   * @returns Typed response based on input definitions.
   *
   * @example
   * ```typescript
   * const response = await session.ask('Configure deployment', {
   *   inputs: [
   *     { type: 'select', name: 'env', options: ['staging', 'production'] },
   *     { type: 'confirm', name: 'notify' },
   *   ] as const,
   * });
   * // response: { env: string; notify: boolean }
   * ```
   */
  async ask<T extends readonly Input[]>(
    question: string,
    options: AskOptions<T> & { inputs: T }
  ): Promise<ResponseFromInputs<T>> {
    if (this.recipients.length === 0) {
      throw new BadRequestError(
        "Cannot ask without recipients. Add recipients when creating or resuming the session."
      );
    }

    const connection = await this.ensureConnected();
    const timeout = options.timeout ?? DEFAULT_ASK_TIMEOUT;

    // Send the question and wait for ack to get message ID
    const messageId = await this.sendAndWaitForAck(connection, {
      role: "agent",
      type: "ask",
      content: question,
      inputs: JSON.stringify(options.inputs),
      persist: options.persist ?? true,
    });

    // Wait for response with timeout
    return new Promise<ResponseFromInputs<T>>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingQuestions.delete(messageId);
        reject(new TimeoutError(`Ask timed out after ${timeout}ms`));
      }, timeout);

      this.pendingQuestions.set(messageId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeoutId,
      });
    });
  }

  /**
   * Close the session's WebSocket connection.
   *
   * Call this when you're done interacting with the session
   * to clean up resources.
   *
   * @example
   * ```typescript
   * session.close();
   * ```
   */
  close(): void {
    // Clear all pending questions
    for (const [, pending] of this.pendingQuestions) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error("Session closed"));
    }
    this.pendingQuestions.clear();

    // Clear all pending acks
    for (const [, pending] of this.pendingAcks) {
      pending.reject(new Error("Session closed"));
    }
    this.pendingAcks.clear();

    // Close WebSocket
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }

  /**
   * List all messages in this session.
   *
   * @param options - Optional settings.
   * @param options.limit - Messages per page (1-100, default 20).
   *
   * @example
   * ```typescript
   * for await (const message of session.messages()) {
   *   console.log(message.content);
   * }
   * ```
   */
  messages(options: { limit?: number } = {}): AsyncIterable<Message> {
    return paginate((cursor) => this.fetchMessagesPage(options.limit, cursor));
  }

  private async fetchMessagesPage(
    limit?: number,
    cursor?: string
  ): Promise<PaginatedResponse<Message>> {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.set("limit", String(limit));
    if (cursor) searchParams.set("after", cursor);

    const query = searchParams.toString();
    const path = `/sessions/${this.id}/messages${query ? `?${query}` : ""}`;

    const apiResponse = await request<ApiPaginatedResponse<ApiMessage>>(this.options, path);

    return {
      data: apiResponse.data.map(transformMessage),
      nextCursor: apiResponse.next_cursor,
    };
  }
}
