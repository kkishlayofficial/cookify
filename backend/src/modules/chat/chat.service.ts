import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/apiError";
import { emitToUser } from "@/lib/realtime";

export async function getOrCreateConversation(userId: string, otherUsername: string) {
  const other = await prisma.user.findUnique({ where: { username: otherUsername } });
  if (!other) throw ApiError.notFound("User not found");
  if (other.id === userId) throw ApiError.badRequest("You cannot message yourself");

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: other.id } } },
      ],
    },
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: { participants: { create: [{ userId }, { userId: other.id }] } },
  });
}

export async function assertParticipant(conversationId: string, userId: string) {
  const membership = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!membership) throw ApiError.forbidden("You are not part of this conversation");
}

export async function listConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const unreadCounts = await prisma.chatMessage.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      senderId: { not: userId },
      readAt: null,
    },
    _count: { _all: true },
  });
  const unreadByConversation = new Map(unreadCounts.map((u) => [u.conversationId, u._count._all]));

  return conversations.map((c) => ({
    id: c.id,
    otherUser: c.participants.map((p) => p.user).find((u) => u.id !== userId) ?? null,
    lastMessage: c.messages[0] ?? null,
    unreadCount: unreadByConversation.get(c.id) ?? 0,
  }));
}

export async function listMessages(conversationId: string, userId: string) {
  await assertParticipant(conversationId, userId);
  return prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
  });
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  await assertParticipant(conversationId, senderId);
  const message = await prisma.chatMessage.create({
    data: { conversationId, senderId, body },
    include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
  });

  // Pushed via the REST path too (not just the message:send socket event) so a
  // recipient's header badge updates even if their own tab sent this through
  // socket.io while the sender used the REST fallback, or vice versa.
  const otherParticipants = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: senderId } },
  });
  for (const participant of otherParticipants) {
    emitToUser(participant.userId, "chat:new-message", { conversationId });
  }

  return message;
}

export async function getUnreadMessageCount(userId: string) {
  return prisma.chatMessage.count({
    where: {
      senderId: { not: userId },
      readAt: null,
      conversation: { participants: { some: { userId } } },
    },
  });
}

export async function markConversationRead(conversationId: string, userId: string) {
  await assertParticipant(conversationId, userId);
  await prisma.chatMessage.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
}
