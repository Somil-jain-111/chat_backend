export const CHAT_ROUTES = {
  create: "/chat/create",
  createGroup: "/chat/group",
  manageGroup: "/chat/:chatId/group",
  groupMembers: "/chat/:chatId/group/members",
  send: "/chat/:chatId/message/send",
  editMessage: "/chat/:chatId/message/:messageId",
  messages: "/chat/:chatId/messages",
  read: "/chat/:chatId/message/:messageId/read",
  lastSeen: "/chat/:chatId/lastseen",
} as const;
