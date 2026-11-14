import type { Server } from "socket.io";

// Set once by attachChatSocket at startup. Kept here (rather than passed around)
// so services like notifications/chat can emit to a user's room without a
// circular import back to the socket wiring.
let io: Server | null = null;

export function setIo(instance: Server) {
  io = instance;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}
