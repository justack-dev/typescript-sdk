import type { ResolvedClientOptions } from "../types/options";
import type { SessionData, CreateSessionParams, PaginatedResponse, ApiPaginatedResponse } from "../types/api";
import { Session } from "./session";
import { request } from "../utils/fetch";
import { paginate } from "../pagination";
import { transformSessionData, transformCreateSessionToApi } from "../utils/transform";

/** API session data format (snake_case). @internal */
interface ApiSessionData {
  session_id: string;
  name: string;
  retention_months: number;
  created_at: string;
  expires_at: string;
  last_message_at: string | null;
  recipients?: {
    recipient_id: string;
    name: string;
    email: string | null;
    external_id: string | null;
    created_at: string;
  }[];
}

/**
 * Resource for managing sessions.
 */
export class SessionsResource {
  constructor(private readonly options: ResolvedClientOptions) {}

  /**
   * Create a new session and return an active Session object.
   *
   * @example
   * ```typescript
   * const session = await client.sessions.create({
   *   name: 'Code Review Agent',
   *   recipients: ['user@example.com'],
   *   notify: true,
   * });
   *
   * // Use the session to interact
   * await session.log('Starting analysis...');
   * const answer = await session.ask('Deploy?');
   * ```
   */
  async create(params: CreateSessionParams): Promise<Session> {
    const apiResponse = await request<ApiSessionData>(this.options, "/sessions", {
      method: "POST",
      body: transformCreateSessionToApi(params),
    });

    return new Session(transformSessionData(apiResponse), this.options);
  }

  /**
   * Resume an existing session by ID.
   *
   * Returns an active Session object for interaction.
   *
   * @example
   * ```typescript
   * const session = await client.sessions.resume('ses_xxx');
   * await session.log('Resuming work...');
   * ```
   */
  async resume(sessionId: string): Promise<Session> {
    const apiResponse = await request<ApiSessionData>(
      this.options,
      `/sessions/${sessionId}`
    );
    return new Session(transformSessionData(apiResponse), this.options);
  }

  /**
   * Get session data by ID.
   *
   * Returns raw session data without interaction methods.
   * Use `resume()` if you need to interact with the session.
   *
   * @example
   * ```typescript
   * const data = await client.sessions.get('ses_xxx');
   * console.log(data.name, data.expiresAt);
   * ```
   */
  async get(sessionId: string): Promise<SessionData> {
    const apiResponse = await request<ApiSessionData>(this.options, `/sessions/${sessionId}`);
    return transformSessionData(apiResponse);
  }

  /**
   * Delete a session.
   *
   * @example
   * ```typescript
   * await client.sessions.delete('ses_xxx');
   * ```
   */
  async delete(sessionId: string): Promise<void> {
    return request<void>(this.options, `/sessions/${sessionId}`, {
      method: "DELETE",
    });
  }

  /**
   * List all sessions with auto-pagination.
   *
   * @param options - Optional settings.
   * @param options.limit - Sessions per page (1-100, default 20).
   *
   * @example
   * ```typescript
   * for await (const session of client.sessions.list()) {
   *   console.log(session.name);
   * }
   * ```
   */
  list(options: { limit?: number } = {}): AsyncIterable<SessionData> {
    return paginate((cursor) => this.fetchSessionsPage(options.limit, cursor));
  }

  private async fetchSessionsPage(
    limit?: number,
    cursor?: string
  ): Promise<PaginatedResponse<SessionData>> {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.set("limit", String(limit));
    if (cursor) searchParams.set("after", cursor);

    const query = searchParams.toString();
    const path = `/sessions${query ? `?${query}` : ""}`;

    const apiResponse = await request<ApiPaginatedResponse<ApiSessionData>>(this.options, path);
    return {
      data: apiResponse.data.map(transformSessionData),
      nextCursor: apiResponse.next_cursor,
    };
  }
}
