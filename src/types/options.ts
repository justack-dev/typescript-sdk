/**
 * Options for creating a JustackClient instance.
 */
export interface JustackClientOptions {
  /**
   * API key for authentication (prefix: jstk_).
   * Required for all operations.
   */
  apiKey: string;

  /**
   * Base URL for the API.
   * @default "https://api.justack.dev/v1"
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  timeout?: number;

  /**
   * Custom fetch implementation.
   * Useful for testing or custom HTTP handling.
   */
  fetch?: typeof fetch;
}

/**
 * Resolved client options (internal use).
 */
export interface ResolvedClientOptions {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  fetch: typeof fetch;
}
