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
    type: "direct" as const,
    title: null,
    ownerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const chats = {
    createOrFind: jest.fn(),
    findById: jest.fn(),
    isParticipant: jest.fn(),
    createGroup: jest.fn(),
    renameGroup: jest.fn(),
    addMember: jest.fn(),
    removeMemberKeepingMinimum: jest.fn(),
  };
  const users = { requireUsers: jest.fn(), requireUserIds: jest.fn() };
  const messages = {
    create: jest.fn(),
    find: jest.fn(),
    markRead: jest.fn(),
    edit: jest.fn(),
    deleteMessage: jest.fn(),
  };
  const service = new ChatService(
    chats as unknown as ChatRepository,
    users as unknown as UserService,
    messages as unknown as FirestoreMessageRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    chats.isParticipant.mockResolvedValue(false);
  });

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

  it("creates a group with the creator and unique requested members", async () => {
    const third = randomUUID();
    chats.createGroup.mockResolvedValue({ ...chat, id: chatId, type: "group", title: "Team", ownerId: userA });

    await expect(service.createGroup(userA, "Team", [userB, third])).resolves.toMatchObject({
      chatId,
      type: "group",
      memberIds: [userA, userB, third],
    });
    expect(users.requireUserIds).toHaveBeenCalledWith([userA, userB, third]);
  });

  it("allows only the sender to edit a message", async () => {
    chats.findById.mockResolvedValue(chat);
    chats.isParticipant.mockResolvedValue(true);
    messages.find.mockResolvedValue({ senderId: userB });

    await expect(service.editMessage(chatId, "message-1", userA, "updated")).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
    expect(messages.edit).not.toHaveBeenCalled();
  });

  it("allows only the group owner to manage members", async () => {
    chats.findById.mockResolvedValue({ ...chat, type: "group", title: "Team", ownerId: userA });
    chats.isParticipant.mockResolvedValue(true);

    await expect(service.addGroupMember(chatId, userB, outsider)).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
    expect(chats.addMember).not.toHaveBeenCalled();
  });

  it("preserves the minimum group size when removing a member", async () => {
    chats.findById.mockResolvedValue({ ...chat, type: "group", title: "Team", ownerId: userA });
    chats.isParticipant.mockResolvedValue(true);
    chats.removeMemberKeepingMinimum.mockResolvedValue("minimum");

    await expect(service.removeGroupMember(chatId, userA, outsider)).rejects.toMatchObject({
      statusCode: 409,
      code: "CONFLICT",
    });
  });

  it("soft-deletes a message for its sender", async () => {
    const deleted = {
      messageId: "message-1",
      senderId: userA,
      text: "",
      createdAt: new Date().toISOString(),
      deletedAt: new Date().toISOString(),
      readBy: {},
    };
    chats.findById.mockResolvedValue(chat);
    chats.isParticipant.mockResolvedValue(true);
    messages.find.mockResolvedValue({ senderId: userA });
    messages.deleteMessage.mockResolvedValue(deleted);

    await expect(service.deleteMessage(chatId, "message-1", userA)).resolves.toEqual(deleted);
  });
});
