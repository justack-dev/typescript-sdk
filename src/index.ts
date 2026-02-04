// Main client
export { JustackClient } from "./client";

// Session class for active interaction
export { Session } from "./resources/session";

// Types - Client options
export type { JustackClientOptions } from "./types/options";

// Types - Input types with inference
export type {
  TextInput,
  ConfirmInput,
  SelectInput,
  SelectOption,
  Input,
  ResponseFromInputs,
} from "./types/inputs";

// Types - Recipient resources
export type {
  Recipient,
  CreateRecipientParams,
  InviteResult,
  InviteUrlResult,
  RecipientInput,
} from "./types/api";

// Types - Session resources
export type {
  SessionData,
  CreateSessionParams,
  AskOptions,
  LogOptions,
  Message,
  MessageRole,
  MessageType,
} from "./types/api";

// Types - Pagination
export type { PaginatedResponse } from "./types/api";

// Error classes
export {
  JustackError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  PaymentRequiredError,
  RateLimitedError,
  NetworkError,
  TimeoutError,
  WebSocketError,
  SessionExpiredError,
  type ErrorCode,
} from "./errors";

// Utilities
export { collect } from "./pagination";

