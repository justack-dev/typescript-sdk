import type { ResolvedClientOptions } from "../types/options";
import type {
  Recipient,
  CreateRecipientParams,
  PaginatedResponse,
  InviteResult,
  InviteUrlResult,
  ApiPaginatedResponse,
} from "../types/api";
import { request } from "../utils/fetch";
import { paginate } from "../pagination";
import {
  transformRecipient,
  transformInviteUrlResult,
  transformCreateRecipientToApi,
} from "../utils/transform";

/** API recipient format (snake_case). @internal */
interface ApiRecipient {
  recipient_id: string;
  name: string;
  email: string | null;
  external_id: string | null;
  created_at: string;
}

/** API invite URL result format. @internal */
interface ApiInviteUrlResult {
  url: string;
  expires_at: string;
}

/**
 * Resource for managing recipients.
 */
export class RecipientsResource {
  constructor(private readonly options: ResolvedClientOptions) {}

  /**
   * Create a new recipient.
   *
   * @example
   * ```typescript
   * const recipient = await client.recipients.create({
   *   name: 'John Doe',
   *   email: 'user@example.com'
   * });
   * ```
   */
  async create(params: CreateRecipientParams): Promise<Recipient> {
    const apiResponse = await request<ApiRecipient>(this.options, "/recipients", {
      method: "POST",
      body: transformCreateRecipientToApi(params),
    });
    return transformRecipient(apiResponse);
  }

  /**
   * Get a recipient by ID.
   *
   * @example
   * ```typescript
   * const recipient = await client.recipients.get('rec_xxx');
   * ```
   */
  async get(recipientId: string): Promise<Recipient> {
    const apiResponse = await request<ApiRecipient>(this.options, `/recipients/${recipientId}`);
    return transformRecipient(apiResponse);
  }

  /**
   * Delete a recipient.
   *
   * @example
   * ```typescript
   * await client.recipients.delete('rec_xxx');
   * ```
   */
  async delete(recipientId: string): Promise<void> {
    return request<void>(this.options, `/recipients/${recipientId}`, {
      method: "DELETE",
    });
  }

  /**
   * List all recipients with auto-pagination.
   *
   * @param options - Optional settings.
   * @param options.limit - Recipients per page (1-100, default 20).
   *
   * @example
   * ```typescript
   * for await (const recipient of client.recipients.list()) {
   *   console.log(recipient.email);
   * }
   * ```
   */
  list(options: { limit?: number } = {}): AsyncIterable<Recipient> {
    return paginate((cursor) => this.fetchRecipientsPage(options.limit, cursor));
  }

  private async fetchRecipientsPage(
    limit?: number,
    cursor?: string
  ): Promise<PaginatedResponse<Recipient>> {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.set("limit", String(limit));
    if (cursor) searchParams.set("after", cursor);

    const query = searchParams.toString();
    const path = `/recipients${query ? `?${query}` : ""}`;

    const apiResponse = await request<ApiPaginatedResponse<ApiRecipient>>(this.options, path);
    return {
      data: apiResponse.data.map(transformRecipient),
      nextCursor: apiResponse.next_cursor,
    };
  }

  /**
   * Send an invite email to a recipient with a magic link.
   *
   * @param recipientId - The recipient's ID.
   *
   * @example
   * ```typescript
   * const result = await client.recipients.sendInvite('rec_xxx');
   * if (result.success) {
   *   console.log('Invite sent!');
   * }
   * ```
   */
  async sendInvite(recipientId: string): Promise<InviteResult> {
    return request<InviteResult>(
      this.options,
      `/recipients/${recipientId}/invite`,
      {
        method: "POST",
      }
    );
  }

  /**
   * Get an invite URL for a recipient.
   * Use this for recipients without email or for custom delivery.
   *
   * @param recipientId - The recipient's ID.
   *
   * @example
   * ```typescript
   * const { url, expiresAt } = await client.recipients.getInviteUrl('rec_xxx');
   * console.log(`Invite URL: ${url}`);
   * ```
   */
  async getInviteUrl(recipientId: string): Promise<InviteUrlResult> {
    const apiResponse = await request<ApiInviteUrlResult>(
      this.options,
      `/recipients/${recipientId}/invite-url`,
      {
        method: "POST",
      }
    );
    return transformInviteUrlResult(apiResponse);
  }
}
