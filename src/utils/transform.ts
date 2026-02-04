import type {
  Recipient,
  SessionData,
  Message,
  ApiMessage,
  InviteUrlResult,
  PaginatedResponse,
  ApiPaginatedResponse,
} from "../types/api";

/**
 * API response types (snake_case wire format).
 * @internal
 */
interface ApiRecipient {
  recipient_id: string;
  name: string;
  email: string | null;
  external_id: string | null;
  created_at: string;
}

interface ApiSessionData {
  session_id: string;
  name: string;
  retention_months: number;
  created_at: string;
  expires_at: string;
  last_message_at: string | null;
  recipients?: ApiRecipient[];
}

interface ApiInviteUrlResult {
  url: string;
  expires_at: string;
}

/**
 * Transform API recipient to SDK format.
 */
export function transformRecipient(api: ApiRecipient): Recipient {
  return {
    recipientId: api.recipient_id,
    name: api.name,
    email: api.email,
    externalId: api.external_id,
    createdAt: api.created_at,
  };
}

/**
 * Transform API session data to SDK format.
 */
export function transformSessionData(api: ApiSessionData): SessionData {
  return {
    sessionId: api.session_id,
    name: api.name,
    retentionMonths: api.retention_months,
    createdAt: api.created_at,
    expiresAt: api.expires_at,
    lastMessageAt: api.last_message_at,
    recipients: api.recipients?.map(transformRecipient),
  };
}

/**
 * Transform API message to SDK format.
 */
export function transformMessage(api: ApiMessage): Message {
  return {
    id: api.id,
    role: api.role,
    type: api.type,
    content: api.content,
    inputs: api.inputs ? JSON.parse(api.inputs) : null,
    senderId: api.sender_id,
    responseContent: api.response_content,
    respondedAt: api.responded_at,
    respondedBy: api.responded_by,
    persist: api.persist,
    createdAt: api.created_at,
  };
}

/**
 * Transform API invite URL result to SDK format.
 */
export function transformInviteUrlResult(api: ApiInviteUrlResult): InviteUrlResult {
  return {
    url: api.url,
    expiresAt: api.expires_at,
  };
}

/**
 * Transform API paginated response to SDK format.
 */
export function transformPaginatedResponse<TApi, TSdk>(
  api: ApiPaginatedResponse<TApi>,
  transformItem: (item: TApi) => TSdk
): PaginatedResponse<TSdk> {
  return {
    data: api.data.map(transformItem),
    nextCursor: api.next_cursor,
  };
}

/**
 * Transform SDK recipient input params to API format.
 */
export function transformRecipientInputToApi(
  input: string | { email?: string; externalId?: string }
): string | { email?: string; external_id?: string } {
  if (typeof input === "string") {
    return input;
  }
  return {
    email: input.email,
    external_id: input.externalId,
  };
}

/**
 * Transform SDK create recipient params to API format.
 */
export function transformCreateRecipientToApi(params: {
  name: string;
  email?: string;
  externalId?: string;
}): { name: string; email?: string; external_id?: string } {
  return {
    name: params.name,
    email: params.email,
    external_id: params.externalId,
  };
}

/**
 * Transform SDK create session params to API format.
 */
export function transformCreateSessionToApi(params: {
  name: string;
  retentionMonths?: number;
  recipients?: (string | { email?: string; externalId?: string })[];
  notify?: boolean;
  callbackUrl?: string;
}): {
  name: string;
  retention_months?: number;
  recipients?: (string | { email?: string; external_id?: string })[];
  notify?: boolean;
  callback_url?: string;
} {
  return {
    name: params.name,
    retention_months: params.retentionMonths,
    recipients: params.recipients?.map(transformRecipientInputToApi),
    notify: params.notify,
    callback_url: params.callbackUrl,
  };
}
