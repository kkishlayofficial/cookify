import { createServer } from "node:http";
import { env } from "@/config/env";
import { createApp } from "@/app";
import { attachChatSocket } from "@/sockets/chat.socket";

const app = createApp();
const httpServer = createServer(app);
attachChatSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`COOKify backend listening on http://localhost:${env.PORT}`);
});
