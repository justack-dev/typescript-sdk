import type {
  JustackClientOptions,
  ResolvedClientOptions,
} from "./types/options";
import { SessionsResource } from "./resources/sessions";
import { RecipientsResource } from "./resources/recipients";

const DEFAULT_BASE_URL = "https://api.justack.dev/v1";
const DEFAULT_TIMEOUT = 30000;

/**
 * The Justack SDK client.
 *
 * @example
 * ```typescript
 * import { JustackClient } from '@justack/sdk';
 *
 * const client = new JustackClient({
 *   apiKey: process.env.JUSTACK_API_KEY
 * });
 *
 * // Create a session with recipients
 * const session = await client.sessions.create({
 *   name: 'Code Review',
 *   recipients: ['user@example.com'],
 *   notify: true,
 * });
 *
 * // Log progress
 * await session.log('Starting analysis...');
 *
 * // Ask a question with typed inputs
 * const { approved } = await session.ask('Deploy to production?', {
 *   inputs: [{ type: 'confirm', name: 'approved' }] as const,
 * });
 *
 * // Cleanup
 * session.close();
 * ```
 */
export class JustackClient {
  private readonly options: ResolvedClientOptions;

  /**
   * Session management (create, resume, list, delete).
   */
  public readonly sessions: SessionsResource;

  /**
   * Recipient management (create, list, auth links).
   */
  public readonly recipients: RecipientsResource;

  /**
   * Create a new JustackClient.
   *
   * @param options - Client configuration options.
   * @throws {Error} If apiKey is not provided.
   */
  constructor(options: JustackClientOptions) {
    if (!options.apiKey) {
      throw new Error("apiKey is required");
    }

    this.options = {
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    };

    this.sessions = new SessionsResource(this.options);
    this.recipients = new RecipientsResource(this.options);
  }
}
