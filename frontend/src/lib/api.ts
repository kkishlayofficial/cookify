// If NEXT_PUBLIC_API_URL isn't set, derive the backend host from the page's own
// hostname in the browser (so opening the app via a LAN IP talks to the backend
// on that same IP instead of "localhost", which would point at the client itself).
// Server-side (SSR) always falls back to localhost, since the Next.js server runs
// on the same machine as the backend regardless of what host the browser used.
function resolveApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return "http://localhost:4000";
}

export const API_URL = resolveApiUrl();

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  isFormData?: boolean;
  /** Internal: set to skip the auto-refresh-on-401 retry (used by the refresh call itself). */
  _skipRefresh?: boolean;
};

const NO_REFRESH_PATHS = ["/api/auth/login", "/api/auth/signup", "/api/auth/refresh", "/api/auth/logout"];

async function rawFetch<T>(path: string, options: RequestOptions): Promise<{ res: Response; data: T }> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.isFormData ? undefined : { "Content-Type": "application/json" },
    body: options.isFormData ? (options.body as FormData) : options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = res.status === 204 ? ({} as T) : await res.json().catch(() => ({}));
  return { res, data: data as T };
}

let refreshInFlight: Promise<boolean> | null = null;

/** Calls POST /api/auth/refresh once (de-duplicated across concurrent callers). */
function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = rawFetch("/api/auth/refresh", { method: "POST", _skipRefresh: true })
      .then(({ res }) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * Thin fetch wrapper for the COOKify backend. Always sends credentials so
 * the httpOnly access/refresh cookies set by the API are included. On a 401
 * (expired access token), it transparently calls the refresh endpoint once
 * and retries the original request - this is what makes "remember this
 * device" actually keep a user signed in across the 15-minute access-token
 * lifetime instead of just across browser restarts.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { res, data } = await rawFetch<Record<string, unknown>>(path, options);

  if (res.status === 401 && !options._skipRefresh && !NO_REFRESH_PATHS.includes(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      const retry = await rawFetch<Record<string, unknown>>(path, options);
      if (!retry.res.ok) {
        throw new ApiRequestError(
          retry.res.status,
          (retry.data?.error as { message?: string })?.message ?? "Request failed",
          (retry.data?.error as { code?: string })?.code,
        );
      }
      return retry.data as T;
    }
  }

  if (!res.ok) {
    throw new ApiRequestError(res.status, (data?.error as { message?: string })?.message ?? "Request failed", (data?.error as { code?: string })?.code);
  }

  return data as T;
}

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}
