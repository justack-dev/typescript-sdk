import type { Message, MessageRole, MessageType } from "./api";

/**
 * WebSocket connection status.
 */
export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

/**
 * Options for WebSocket connection.
 */
export interface WebSocketOptions {
  /**
   * Whether to automatically reconnect on disconnect.
   * @default true
   */
  autoReconnect?: boolean;

  /**
   * Maximum number of reconnection attempts.
   * @default 5
   */
  maxReconnectAttempts?: number;

  /**
   * Base delay between reconnection attempts in ms.
   * Uses exponential backoff.
   * @default 1000
   */
  reconnectDelay?: number;
}

/**
 * Resolved WebSocket options (internal use).
 */
export interface ResolvedWebSocketOptions {
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  headers: Record<string, string>;
}

/**
 * WebSocket event handlers.
 */
export interface WebSocketEvents {
  connected: () => void;
  message: (message: Message) => void;
  messageUpdated: (message: Message) => void;
  messageAck: (data: { id: string }) => void;
  error: (error: { message: string; code?: number }) => void;
  disconnected: (code?: number, reason?: string) => void;
  statusChange: (status: ConnectionStatus) => void;
}

/**
 * Server-sent connected message.
 */
export interface WebSocketConnectedEvent {
  type: "connected";
}

/**
 * Server-sent message event.
 */
export interface WebSocketMessageEvent {
  type: "message";
  data: Message;
}

/**
 * Server-sent message acknowledgment.
 */
export interface WebSocketMessageAckEvent {
  type: "message_ack";
  data: { id: string };
}

/**
 * Server-sent message update event (when ask message receives a response).
 */
export interface WebSocketMessageUpdatedEvent {
  type: "message_updated";
  data: Message;
}

/**
 * Server-sent error event.
 */
export interface WebSocketErrorEvent {
  type: "error";
  data: { message: string; code?: number };
}

/**
 * All possible server-sent messages.
 */
export type WebSocketServerMessage =
  | WebSocketConnectedEvent
  | WebSocketMessageEvent
  | WebSocketMessageUpdatedEvent
  | WebSocketMessageAckEvent
  | WebSocketErrorEvent;

/**
 * Client-sent message payload using new format.
 */
export interface WebSocketSendPayload {
  role: MessageRole;
  type: MessageType;
  content: string;
  inputs?: string;
  persist?: boolean;
}

/**
 * Client-sent message format.
 */
export interface WebSocketClientMessage {
  type: "message";
  data: WebSocketSendPayload;
}
