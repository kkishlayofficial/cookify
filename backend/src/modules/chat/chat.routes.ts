import { Router } from "express";
import { param } from "@/lib/params";
import { requireAuth, type AuthenticatedRequest } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { sendMessageSchema } from "@/modules/chat/chat.validation";
import * as chatService from "@/modules/chat/chat.service";

export const chatRouter = Router();

chatRouter.get("/conversations", requireAuth, async (req: AuthenticatedRequest, res) => {
  const conversations = await chatService.listConversations(req.user!.id);
  res.json({ conversations });
});

chatRouter.get("/unread-count", requireAuth, async (req: AuthenticatedRequest, res) => {
  const count = await chatService.getUnreadMessageCount(req.user!.id);
  res.json({ count });
});

chatRouter.post("/conversations/with/:username", requireAuth, async (req: AuthenticatedRequest, res) => {
  const conversation = await chatService.getOrCreateConversation(req.user!.id, param(req, "username"));
  res.json({ conversation });
});

chatRouter.get("/conversations/:id/messages", requireAuth, async (req: AuthenticatedRequest, res) => {
  const messages = await chatService.listMessages(param(req, "id"), req.user!.id);
  res.json({ messages });
});

chatRouter.post("/conversations/:id/read", requireAuth, async (req: AuthenticatedRequest, res) => {
  await chatService.markConversationRead(param(req, "id"), req.user!.id);
  res.status(204).send();
});

// Also exposed over REST (in addition to the socket.io "message:send" event) so
// chat still works for simple request/response clients and automated tests.
chatRouter.post(
  "/conversations/:id/messages",
  requireAuth,
  validate({ body: sendMessageSchema }),
  async (req: AuthenticatedRequest, res) => {
    const message = await chatService.sendMessage(param(req, "id"), req.user!.id, req.body.body);
    res.status(201).json({ message });
  },
);
