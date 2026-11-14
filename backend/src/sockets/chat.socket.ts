import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { parseCookie } from "cookie";
import { env } from "@/config/env";
import { verifyAccessToken } from "@/lib/jwt";
import { assertAccountActive } from "@/lib/authz";
import { setIo } from "@/lib/realtime";
import * as chatService from "@/modules/chat/chat.service";

type AuthedSocket = Socket & { data: { userId: string } };

function ackError(ack: ((res: unknown) => void) | undefined, error: string) {
  ack?.({ ok: false, error });
}

export function attachChatSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  });

  // Lets notification/chat services emit to a user's `user:${userId}` room
  // (e.g. for header badge counts) without needing a reference to this `io`.
  setIo(io);

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const parsed = cookieHeader ? parseCookie(cookieHeader) : {};
      const token = parsed.accessToken ?? (socket.handshake.auth?.token as string | undefined);
      if (!token) throw new Error("No access token provided");

      const payload = verifyAccessToken(token);
      // Re-checked against the DB (not just the token) so a banned user can't open a new
      // chat connection even with an access token that hasn't expired yet.
      await assertAccountActive(payload.sub);
      (socket as AuthedSocket).data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as AuthedSocket).data.userId;
    // Personal room, reserved for future real-time notification pushes.
    socket.join(`user:${userId}`);

    socket.on("conversation:join", async (conversationId: string, ack?: (res: unknown) => void) => {
      try {
        // A socket can only join a conversation room it is actually a participant of,
        // otherwise it would silently receive every other conversation's live messages.
        await chatService.assertParticipant(conversationId, userId);
        socket.join(`conversation:${conversationId}`);
        ack?.({ ok: true });
      } catch (err) {
        ackError(ack, err instanceof Error ? err.message : "Not authorized to join this conversation");
      }
    });

    socket.on("conversation:leave", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("message:send", async (payload: { conversationId: string; body: string }, ack?: (res: unknown) => void) => {
      try {
        // Re-checked per message (not just at connect time) so a mid-session ban stops a
        // still-open socket from sending new messages, and a non-participant can't send
        // into a conversation they were never added to.
        await assertAccountActive(userId);
        const message = await chatService.sendMessage(payload.conversationId, userId, payload.body);
        io.to(`conversation:${payload.conversationId}`).emit("message:new", message);
        ack?.({ ok: true, message });
      } catch (err) {
        ackError(ack, err instanceof Error ? err.message : "Failed to send message");
      }
    });
  });

  return io;
}
