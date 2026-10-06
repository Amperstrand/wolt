import { isTransportFailure } from "./error.js";

export const CONSUMER_API = "https://consumer-api.wolt.com";
export const WOLT_ORIGIN = "https://wolt.com";
export const USER_AGENT = "wolt/0.1";

export interface ApiResult<T> {
  readonly ok: true;
  readonly value: T;
}

export interface ApiFailure {
  readonly ok: false;
  /** "http" = answered with an error status; "network" = transport death; "parse" = non-JSON 2xx. */
  readonly kind: "http" | "network" | "parse";
  readonly status: number;
  readonly body: string;
}

export type FetchApiResult<T> = ApiResult<T> | ApiFailure;

function headers(): Record<string, string> {
  return { "user-agent": USER_AGENT, accept: "application/json", "app-language": "en", platform: "Web" };
}

export async function getJson<T>(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchApiResult<T>> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: headers(),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    if (!isTransportFailure(error)) throw error;
    return {
      ok: false,
      kind: "network",
      status: 0,
      body: error instanceof Error ? error.message : String(error),
    };
  }
  const text = await response.text();
  if (!response.ok) {
    return { ok: false, kind: "http", status: response.status, body: text.slice(0, 300) };
  }
  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return { ok: false, kind: "parse", status: response.status, body: text.slice(0, 300) };
  }
}

export async function getHtml(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ readonly ok: true; readonly html: string } | ApiFailure> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    if (!isTransportFailure(error)) throw error;
    return {
      ok: false,
      kind: "network",
      status: 0,
      body: error instanceof Error ? error.message : String(error),
    };
  }
  const html = await response.text();
  if (!response.ok) {
    return { ok: false, kind: "http", status: response.status, body: html.slice(0, 300) };
  }
  return { ok: true, html };
}
