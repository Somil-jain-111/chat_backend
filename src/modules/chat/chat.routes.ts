export const CHAT_ROUTES = {
  create: "/chat/create",
  send: "/chat/:chatId/message/send",
  messages: "/chat/:chatId/messages",
  read: "/chat/:chatId/message/:messageId/read",
  lastSeen: "/chat/:chatId/lastseen",
} as const;
