import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import cookie from "cookie";
import { env } from "@/config/env";
import { verifyAccessToken } from "@/lib/jwt";
import * as chatService from "@/modules/chat/chat.service";

type AuthedSocket = Socket & { data: { userId: string } };

export function attachChatSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const parsed = cookieHeader ? cookie.parse(cookieHeader) : {};
      const token = parsed.accessToken ?? (socket.handshake.auth?.token as string | undefined);
      if (!token) throw new Error("No access token provided");

      const payload = verifyAccessToken(token);
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

    socket.on("conversation:join", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("conversation:leave", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("message:send", async (payload: { conversationId: string; body: string }, ack?: (res: unknown) => void) => {
      try {
        const message = await chatService.sendMessage(payload.conversationId, userId, payload.body);
        io.to(`conversation:${payload.conversationId}`).emit("message:new", message);
        ack?.({ ok: true, message });
      } catch (err) {
        ack?.({ ok: false, error: err instanceof Error ? err.message : "Failed to send message" });
      }
    });
  });

  return io;
}
