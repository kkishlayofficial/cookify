import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/apiError";

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

async function assertParticipant(conversationId: string, userId: string) {
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

  return conversations.map((c) => ({
    id: c.id,
    otherUser: c.participants.map((p) => p.user).find((u) => u.id !== userId) ?? null,
    lastMessage: c.messages[0] ?? null,
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
  return prisma.chatMessage.create({
    data: { conversationId, senderId, body },
    include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
  });
}
