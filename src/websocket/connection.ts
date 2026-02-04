import type { ResolvedClientOptions } from "../types/options";
import type {
  WebSocketOptions,
  ResolvedWebSocketOptions,
  WebSocketEvents,
  WebSocketServerMessage,
  WebSocketClientMessage,
  ConnectionStatus,
  WebSocketSendPayload,
} from "../types/websocket";
import type { Message } from "../types/api";
import { WebSocketError } from "../errors";

type EventCallback<K extends keyof WebSocketEvents> = WebSocketEvents[K];

/**
 * Creates a WebSocket connection to a Justack session.
 *
 * @internal This is used internally by the Session class.
 */
export function createWebSocketConnection(
  options: ResolvedClientOptions,
  sessionId: string,
  wsOptions: WebSocketOptions = {}
): WebSocketConnection {
  // Convert HTTP base URL to WebSocket URL
  const baseUrl = options.baseUrl.replace(/^http/, "ws");
  const url = `${baseUrl}/sessions/${sessionId}/ws`;

  return new WebSocketConnection(url, {
    autoReconnect: wsOptions.autoReconnect ?? true,
    maxReconnectAttempts: wsOptions.maxReconnectAttempts ?? 5,
    reconnectDelay: wsOptions.reconnectDelay ?? 1000,
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
    },
  });
}

/**
 * A WebSocket connection to a Justack session.
 *
 * Supports auto-reconnection with exponential backoff.
 */
export class WebSocketConnection {
  private ws: WebSocket | null = null;
  private readonly listeners: Map<
    keyof WebSocketEvents,
    Set<EventCallback<keyof WebSocketEvents>>
  > = new Map();
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private manualClose = false;
  private _status: ConnectionStatus = "disconnected";
  private _connected = false;
  private connectPromise: Promise<void> | null = null;

  constructor(
    private readonly url: string,
    private readonly options: ResolvedWebSocketOptions
  ) {}

  /**
   * Current connection status.
   */
  get status(): ConnectionStatus {
    return this._status;
  }

  /**
   * Whether the WebSocket is currently connected.
   */
  get isConnected(): boolean {
    return this._connected;
  }

  private setStatus(status: ConnectionStatus): void {
    if (this._status !== status) {
      this._status = status;
      this._connected = status === "connected";
      this.emit("statusChange", status);
    }
  }

  /**
   * Connect to the WebSocket.
   * Returns a promise that resolves when connected.
   */
  connect(): Promise<void> {
    if (this.connectPromise) {
      return this.connectPromise;
    }

    if (this._connected) {
      return Promise.resolve();
    }

    this.connectPromise = new Promise<void>((resolve, reject) => {
      this.setStatus("connecting");

      try {
        // Pass headers for Node.js WebSocket (ws package)
        // Browser WebSocket doesn't support headers, but SDK is for server-side use
        this.ws = new WebSocket(this.url, {
          headers: this.options.headers,
        } as unknown as string[]);
      } catch (error) {
        this.setStatus("error");
        this.connectPromise = null;
        const message =
          error instanceof Error ? error.message : "Failed to create WebSocket";
        this.emit("error", { message });
        reject(new WebSocketError(message));
        return;
      }

      const cleanup = () => {
        this.connectPromise = null;
      };

      this.ws.onopen = () => {
        // Status will be set to 'connected' when we receive the connected message
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketServerMessage = JSON.parse(
            event.data as string
          );
          this.handleMessage(message);

          // Resolve promise on connected message
          if (message.type === "connected") {
            cleanup();
            resolve();
          }
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = (event) => {
        this.ws = null;
        this.setStatus("disconnected");
        this.emit("disconnected", event.code, event.reason);

        // If we were waiting for connection, reject
        if (this.connectPromise) {
          cleanup();
          reject(
            new WebSocketError(
              `WebSocket closed during connection: ${event.code} ${event.reason}`
            )
          );
        }

        // Attempt reconnection if not manually closed
        if (!this.manualClose && this.options.autoReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (event) => {
        this.setStatus("error");
        // Try to extract more error details
        const errorEvent = event as ErrorEvent;
        const message = errorEvent.message || "WebSocket connection error";
        this.emit("error", { message });
      };
    });

    return this.connectPromise;
  }

  private handleMessage(message: WebSocketServerMessage): void {
    switch (message.type) {
      case "connected":
        this.setStatus("connected");
        this.reconnectAttempts = 0;
        this.emit("connected");
        break;

      case "message":
        this.emit("message", message.data as Message);
        break;

      case "message_updated":
        this.emit("messageUpdated", message.data as Message);
        break;

      case "message_ack":
        this.emit("messageAck", message.data);
        break;

      case "error":
        this.emit("error", message.data);
        break;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts) +
        Math.random() * 1000,
      30000 // Max 30 seconds
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(() => {
        // Reconnection failed, will try again if attempts remain
      });
    }, delay);
  }

  /**
   * Send a message through the WebSocket.
   *
   * @throws {WebSocketError} If the connection is not open.
   */
  send(data: WebSocketSendPayload): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new WebSocketError("WebSocket is not connected");
    }

    const message: WebSocketClientMessage = {
      type: "message",
      data,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Close the WebSocket connection.
   *
   * This will prevent auto-reconnection.
   */
  close(): void {
    this.manualClose = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      // Remove event handlers to prevent recursion from error events during close
      const ws = this.ws;
      this.ws = null;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      try {
        ws.close();
      } catch {
        // Ignore errors when closing
      }
    }

    this.connectPromise = null;
    this.setStatus("disconnected");
  }

  /**
   * Subscribe to a WebSocket event.
   *
   * @returns A function to unsubscribe.
   */
  on<K extends keyof WebSocketEvents>(
    event: K,
    callback: WebSocketEvents[K]
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners
      .get(event)!
      .add(callback as EventCallback<keyof WebSocketEvents>);

    // Return unsubscribe function
    return () => {
      this.listeners
        .get(event)
        ?.delete(callback as EventCallback<keyof WebSocketEvents>);
    };
  }

  /**
   * Unsubscribe from a WebSocket event.
   */
  off<K extends keyof WebSocketEvents>(
    event: K,
    callback: WebSocketEvents[K]
  ): void {
    this.listeners
      .get(event)
      ?.delete(callback as EventCallback<keyof WebSocketEvents>);
  }

  private emit<K extends keyof WebSocketEvents>(
    event: K,
    ...args: Parameters<WebSocketEvents[K]>
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (callback as (...args: any[]) => void)(...args);
        } catch (error) {
          console.error(
            `Error in WebSocket event handler for "${event}":`,
            error
          );
        }
      }
    }
  }
}
