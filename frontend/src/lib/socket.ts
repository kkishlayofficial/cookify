import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/lib/api";

let socket: Socket | null = null;

/**
 * Returns a singleton Socket.io client authenticated via the access-token
 * cookie. `upgrade: false` keeps the connection on HTTP long-polling only:
 * some sandboxed/proxied network environments (including this project's
 * local dev/test setup) silently drop the raw WebSocket upgrade handshake,
 * which otherwise disconnects the socket entirely instead of falling back
 * gracefully. Polling-only is slightly higher latency but reliable
 * everywhere; this can be removed once a given deployment target is
 * confirmed to support WebSocket upgrades end-to-end.
 */
export function getSocket(): Socket {
  if (!socket) {
    // WebSocket is the primary transport; Socket.IO falls back to long-polling
    // automatically if the upgrade is rejected by a proxy. Forcing polling-only
    // was causing connection-pool exhaustion in multi-tab scenarios (browsers
    // allow ~6 concurrent HTTP/1.1 connections per domain, so 7+ tabs would
    // queue their poll requests and experience severe message delays).
    socket = io(API_URL, { withCredentials: true });
  }
  return socket;
}
