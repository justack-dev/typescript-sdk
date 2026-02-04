import type { PaginatedResponse } from "./types/api";

/**
 * Create an async iterable that auto-paginates through results.
 *
 * @example
 * ```typescript
 * for await (const session of client.sessions.list()) {
 *   console.log(session.name);
 * }
 * ```
 */
export async function* paginate<T>(
  fetcher: (cursor?: string) => Promise<PaginatedResponse<T>>
): AsyncGenerator<T, void, undefined> {
  let cursor: string | undefined;

  do {
    const response = await fetcher(cursor);

    for (const item of response.data) {
      yield item;
    }

    cursor = response.nextCursor ?? undefined;
  } while (cursor);
}

/**
 * Collect all items from an async iterable into an array.
 *
 * @example
 * ```typescript
 * const allSessions = await collect(client.sessions.list());
 * ```
 */
export async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
}
