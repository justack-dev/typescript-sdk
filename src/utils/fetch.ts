import {
  createErrorFromResponse,
  NetworkError,
  TimeoutError,
  JustackError,
} from "../errors";
import type { ResolvedClientOptions } from "../types/options";

/**
 * Options for a single request.
 */
export interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Make an HTTP request to the API.
 */
export async function request<T>(
  options: ResolvedClientOptions,
  path: string,
  requestOptions: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, signal } = requestOptions;

  const url = `${options.baseUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Set Authorization header
  headers["Authorization"] = `Bearer ${options.apiKey}`;

  // Create timeout controller
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(
    () => timeoutController.abort(),
    options.timeout
  );

  // Combine signals if one was provided
  let combinedSignal: AbortSignal;
  if (signal) {
    // Use AbortSignal.any if available (Node 20+, modern browsers)
    if ("any" in AbortSignal) {
      combinedSignal = AbortSignal.any([signal, timeoutController.signal]);
    } else {
      // Fallback: just use the timeout signal
      combinedSignal = timeoutController.signal;
    }
  } else {
    combinedSignal = timeoutController.signal;
  }

  try {
    const response = await options.fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: combinedSignal,
    });

    clearTimeout(timeoutId);

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json();

    if (!response.ok) {
      throw createErrorFromResponse(response.status, data);
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    // Re-throw known errors
    if (error instanceof JustackError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new TimeoutError();
      }
      throw new NetworkError(`Network request failed: ${error.message}`, error);
    }

    throw error;
  }
}
