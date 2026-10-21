import { randomUUID } from "crypto";
import type { ChatRepository } from "../src/modules/chat/chat.repository";
import { ChatService } from "../src/modules/chat/chat.service";
import type { FirestoreMessageRepository } from "../src/modules/chat/firestore-message.repository";
import type { UserService } from "../src/modules/user/user.service";

describe("ChatService", () => {
  const userA = randomUUID();
  const userB = randomUUID();
  const outsider = randomUUID();
  const chatId = randomUUID();
  const [first, second] = [userA, userB].sort() as [string, string];
  const chat = {
    id: chatId,
    userAId: first,
    userBId: second,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const chats = {
    createOrFind: jest.fn(),
    findById: jest.fn(),
  };
  const users = { requireUsers: jest.fn() };
  const messages = {
    create: jest.fn(),
    find: jest.fn(),
    markRead: jest.fn(),
  };
  const service = new ChatService(
    chats as unknown as ChatRepository,
    users as unknown as UserService,
    messages as unknown as FirestoreMessageRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it("canonicalizes participants before concurrency-safe creation", async () => {
    chats.createOrFind.mockResolvedValue({ chat, created: true });

    await expect(service.create(userB, userA)).resolves.toEqual({
      chatId,
      created: true,
    });
    expect(chats.createOrFind).toHaveBeenCalledWith(first, second);
  });

  it("rejects self chats", async () => {
    await expect(service.create(userA, userA)).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });
  });

  it("checks SQL membership before writing a message", async () => {
    chats.findById.mockResolvedValue(chat);

    await expect(
      service.sendMessage(chatId, outsider, "hello"),
    ).rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
    expect(messages.create).not.toHaveBeenCalled();
  });
});
