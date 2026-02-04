import type { Input } from "./inputs";

// ============================================================================
// Recipient Types
// ============================================================================

/**
 * Recipient resource.
 */
export interface Recipient {
  recipientId: string;
  name: string;
  email: string | null;
  externalId: string | null;
  createdAt: string;
}

/**
 * Parameters for creating a recipient.
 */
export interface CreateRecipientParams {
  /**
   * Display name for the recipient.
   */
  name: string;

  /**
   * Email address for the recipient.
   * At least one of email or externalId is required.
   */
  email?: string;

  /**
   * External identifier for the recipient.
   * At least one of email or externalId is required.
   */
  externalId?: string;
}

/**
 * Result of sending an invite.
 */
export interface InviteResult {
  success: boolean;
  message?: string;
}

/**
 * Result of getting an invite URL.
 */
export interface InviteUrlResult {
  url: string;
  expiresAt: string;
}

/**
 * Recipient input - can be a string (email or externalId) or an object.
 */
export type RecipientInput = string | { email?: string; externalId?: string };

// ============================================================================
// Session Types
// ============================================================================

/**
 * Session data returned from list/get operations.
 */
export interface SessionData {
  sessionId: string;
  name: string;
  retentionMonths: number;
  createdAt: string;
  expiresAt: string;
  lastMessageAt: string | null;
  recipients?: Recipient[];
}

/**
 * Parameters for creating a session.
 */
export interface CreateSessionParams {
  /**
   * Display name for the session.
   */
  name: string;

  /**
   * How long to retain the session (1-12 months).
   * @default 1
   */
  retentionMonths?: number;

  /**
   * Recipients to add to the session.
   * Can be email addresses, external IDs, or recipient objects.
   */
  recipients?: RecipientInput[];

  /**
   * Whether to send notifications to recipients.
   * @default false
   */
  notify?: boolean;

  /**
   * Callback URL for webhooks.
   */
  callbackUrl?: string;
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Message role - who sent the message.
 */
export type MessageRole = "agent" | "recipient";

/**
 * Message type - the purpose of the message.
 */
export type MessageType = "log" | "ask";

/**
 * Message resource returned by the API (wire format).
 * @internal
 */
export interface ApiMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  inputs: string | null;
  sender_id: string | null;
  response_content: string | null;
  responded_at: string | null;
  responded_by: string | null;
  persist: boolean;
  created_at: string;
}

/**
 * Message with parsed inputs.
 */
export interface Message {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  inputs: Input[] | null;
  senderId: string | null;
  responseContent: string | null;
  respondedAt: string | null;
  respondedBy: string | null;
  persist: boolean;
  createdAt: string;
}

// ============================================================================
// Ask/Log Types
// ============================================================================

/**
 * Options for the ask() method.
 */
export interface AskOptions<T extends readonly Input[] = readonly Input[]> {
  /**
   * Structured inputs for the question.
   */
  inputs?: T;

  /**
   * Timeout in milliseconds for waiting for a response.
   * @default 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Whether to persist the message.
   * @default true
   */
  persist?: boolean;
}

/**
 * Options for the log() method.
 */
export interface LogOptions {
  /**
   * Whether to persist the message.
   * @default true
   */
  persist?: boolean;
}

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Paginated response (internal, matches API wire format).
 * @internal
 */
export interface ApiPaginatedResponse<T> {
  data: T[];
  next_cursor: string | null;
}

/**
 * Paginated response from list endpoints.
 */
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * API error codes.
 */
export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "PAYMENT_REQUIRED"
  | "RATE_LIMITED"
  | "SESSION_EXPIRED";

/**
 * API error response format.
 */
export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}
