import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";

// The "cookie" package is ESM-only and ts-jest's CommonJS test environment can't `require()`
// it directly (this only affects the Jest test runner, not the real app - the compiled
// production build runs fine under plain Node). These tests authenticate sockets via
// `auth.token` rather than a cookie header, so a minimal same-shape stub is sufficient here.
jest.mock("cookie", () => ({
  parseCookie: (header: string) =>
    Object.fromEntries(
      header
        .split(";")
        .map((pair) => pair.trim().split("="))
        .filter(([key]) => Boolean(key))
        .map(([key, ...rest]) => [key, decodeURIComponent(rest.join("="))]),
    ),
}));

import { attachChatSocket } from "@/sockets/chat.socket";
import { prisma } from "@/lib/prisma";
import * as authService from "@/modules/auth/auth.service";
import * as chatService from "@/modules/chat/chat.service";
import * as moderationService from "@/modules/moderation/moderation.service";

type Ack = { ok: boolean; [key: string]: unknown };

/**
 * Proves the chat socket layer actually enforces conversation membership and
 * live account status, not just the REST endpoints:
 *  - a non-participant can't join a conversation's room or send into it
 *  - a non-participant never receives another conversation's broadcast
 *  - a banned user can't open a new socket connection
 *  - an already-connected socket loses send access the moment its user is banned
 */
describe("chat socket authorization", () => {
  let httpServer: ReturnType<typeof createServer>;
  let baseUrl: string;
  let conversationId: string;
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let userBId: string;
  let userCId: string;
  const openSockets: ClientSocket[] = [];

  beforeAll(async () => {
    httpServer = createServer();
    attachChatSocket(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address() as AddressInfo;
    baseUrl = `http://localhost:${port}`;

    const runId = Date.now().toString(36);
    const password = "TestPassword123";
    const userA = await authService.signup({ email: `chat-a-${runId}@example.com`, username: `chata${runId}`, password });
    const userB = await authService.signup({ email: `chat-b-${runId}@example.com`, username: `chatb${runId}`, password });
    const userC = await authService.signup({ email: `chat-c-${runId}@example.com`, username: `chatc${runId}`, password });
    userBId = userB.id;
    userCId = userC.id;

    tokenA = (await authService.issueSession(userA.id, true)).accessToken;
    tokenB = (await authService.issueSession(userB.id, true)).accessToken;
    tokenC = (await authService.issueSession(userC.id, true)).accessToken;

    // A conversation between A and B only. C is a registered user but never added to it.
    const conversation = await chatService.getOrCreateConversation(userA.id, userB.username);
    conversationId = conversation.id;
  });

  afterAll(async () => {
    openSockets.forEach((s) => s.disconnect());
    httpServer.close();
    await prisma.$disconnect();
  });

  function connect(token: string): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const socket = ioClient(baseUrl, { auth: { token }, transports: ["websocket"], forceNew: true });
      openSockets.push(socket);
      socket.once("connect", () => resolve(socket));
      socket.once("connect_error", (err) => reject(err));
    });
  }

  function emitWithAck(socket: ClientSocket, event: string, payload: unknown): Promise<Ack> {
    return new Promise((resolve) => socket.emit(event, payload, resolve));
  }

  it("lets a participant join their own conversation", async () => {
    const socketA = await connect(tokenA);
    const ack = await emitWithAck(socketA, "conversation:join", conversationId);
    expect(ack.ok).toBe(true);
  });

  it("rejects a non-participant trying to join the conversation's room", async () => {
    const socketC = await connect(tokenC);
    const ack = await emitWithAck(socketC, "conversation:join", conversationId);
    expect(ack.ok).toBe(false);
  });

  it("rejects a non-participant trying to send a message into the conversation, even without joining first", async () => {
    const socketC = await connect(tokenC);
    const ack = await emitWithAck(socketC, "message:send", { conversationId, body: "sneaky" });
    expect(ack.ok).toBe(false);
  });

  it("broadcasts a message only to sockets that successfully joined the room, not to a non-participant", async () => {
    const socketA = await connect(tokenA);
    const socketB = await connect(tokenB);
    const socketC = await connect(tokenC);

    await emitWithAck(socketA, "conversation:join", conversationId);
    await emitWithAck(socketB, "conversation:join", conversationId);
    // C's join is rejected (not a participant), so it never enters the room.
    const cJoinAck = await emitWithAck(socketC, "conversation:join", conversationId);
    expect(cJoinAck.ok).toBe(false);

    let receivedByC = false;
    socketC.once("message:new", () => {
      receivedByC = true;
    });
    const receivedByB = new Promise<void>((resolve) => socketB.once("message:new", () => resolve()));

    const sendAck = await emitWithAck(socketA, "message:send", { conversationId, body: "hello B" });
    expect(sendAck.ok).toBe(true);

    await receivedByB;
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(receivedByC).toBe(false);
  });

  it("rejects a brand-new connection attempt from an already-banned user", async () => {
    await moderationService.banUser(userCId);
    await expect(connect(tokenC)).rejects.toBeTruthy();
  });

  it("rejects message:send from an already-connected socket the moment its user is banned mid-session", async () => {
    const socketB = await connect(tokenB);
    await emitWithAck(socketB, "conversation:join", conversationId);

    await moderationService.banUser(userBId);

    const ack = await emitWithAck(socketB, "message:send", { conversationId, body: "still here?" });
    expect(ack.ok).toBe(false);
  });
});
