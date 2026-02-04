/**
 * Error codes used by the SDK.
 */
export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "PAYMENT_REQUIRED"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "WEBSOCKET_ERROR"
  | "SESSION_EXPIRED";

// Extend Error interface for V8's captureStackTrace
interface ErrorConstructorWithCapture extends ErrorConstructor {
  captureStackTrace?(
    targetObject: object,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    constructorOpt?: Function
  ): void;
}

/**
 * Base error class for all Justack SDK errors.
 */
export class JustackError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly status?: number,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "JustackError";

    // Maintains proper stack trace in V8
    const ErrorWithCapture = Error as ErrorConstructorWithCapture;
    if (ErrorWithCapture.captureStackTrace) {
      ErrorWithCapture.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error for invalid request parameters (400).
 */
export class BadRequestError extends JustackError {
  constructor(message: string) {
    super(message, "BAD_REQUEST", 400);
    this.name = "BadRequestError";
  }
}

/**
 * Error for invalid or missing credentials (401).
 */
export class UnauthorizedError extends JustackError {
  constructor(message: string = "Invalid or missing credentials") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

/**
 * Error for insufficient permissions (403).
 */
export class ForbiddenError extends JustackError {
  constructor(message: string = "Insufficient permissions") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

/**
 * Error for resource not found (404).
 */
export class NotFoundError extends JustackError {
  constructor(message: string = "Resource not found") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

/**
 * Error for insufficient credits (402).
 */
export class PaymentRequiredError extends JustackError {
  constructor(message: string = "Insufficient credits") {
    super(message, "PAYMENT_REQUIRED", 402);
    this.name = "PaymentRequiredError";
  }
}

/**
 * Error for rate limit exceeded (429).
 */
export class RateLimitedError extends JustackError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, "RATE_LIMITED", 429);
    this.name = "RateLimitedError";
  }
}

/**
 * Error for network failures.
 */
export class NetworkError extends JustackError {
  constructor(message: string, cause?: Error) {
    super(message, "NETWORK_ERROR", undefined, cause);
    this.name = "NetworkError";
  }
}

/**
 * Error for request timeout.
 */
export class TimeoutError extends JustackError {
  constructor(message: string = "Request timed out") {
    super(message, "TIMEOUT");
    this.name = "TimeoutError";
  }
}

/**
 * Error for WebSocket failures.
 */
export class WebSocketError extends JustackError {
  constructor(message: string, cause?: Error) {
    super(message, "WEBSOCKET_ERROR", undefined, cause);
    this.name = "WebSocketError";
  }
}

/**
 * Error for expired sessions.
 */
export class SessionExpiredError extends JustackError {
  constructor(message: string = "Session has expired") {
    super(message, "SESSION_EXPIRED");
    this.name = "SessionExpiredError";
  }
}

/**
 * Create the appropriate error from an API response.
 */
export function createErrorFromResponse(
  status: number,
  body: { error: { code: string; message: string } }
): JustackError {
  const { code, message } = body.error;

  switch (code) {
    case "BAD_REQUEST":
      return new BadRequestError(message);
    case "UNAUTHORIZED":
      return new UnauthorizedError(message);
    case "FORBIDDEN":
      return new ForbiddenError(message);
    case "NOT_FOUND":
      return new NotFoundError(message);
    case "PAYMENT_REQUIRED":
      return new PaymentRequiredError(message);
    case "RATE_LIMITED":
      return new RateLimitedError(message);
    default:
      return new JustackError(message, code as ErrorCode, status);
  }
}
