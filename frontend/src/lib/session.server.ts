import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";
import type { PublicUser } from "@/lib/types";

/**
 * Resolves the logged-in user on the server, from the incoming request's own
 * cookies, so the very first HTML response already reflects the real session
 * instead of a logged-out guess that the client then has to correct (the
 * flash of the login UI on reload that this exists to avoid).
 *
 * Doesn't attempt refresh-token rotation here (that needs to set cookies,
 * which a Server Component can't do) - if the access token has expired,
 * this returns null and the existing client-side refresh-on-401 flow in
 * `apiFetch` takes over once the page hydrates.
 */
export async function getServerUser(): Promise<PublicUser | null> {
  const store = await cookies();
  const accessToken = store.get("accessToken")?.value;
  if (!accessToken) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Cookie: `accessToken=${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: PublicUser };
    return data.user;
  } catch {
    return null;
  }
}
