import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/errors/business.exception";
import { UserService } from "../user/user.service";
import { ChatEntity } from "./chat.entity";
import { ChatRepository } from "./chat.repository";
import { FirestoreMessageRepository } from "./firestore-message.repository";
import { LastSeenResponse, MessageResponse } from "./firestore-message.model";

@Injectable()
export class ChatService {
  constructor(
    private readonly chats: ChatRepository,
    private readonly users: UserService,
    private readonly messages: FirestoreMessageRepository,
  ) {}

  async create(userAId: string, userBId: string): Promise<{ chatId: string; created: boolean }> {
    if (userAId === userBId) throw BusinessException.badRequest("A user cannot create a chat with themselves");
    const [first, second] = [userAId, userBId].sort() as [string, string];
    await this.users.requireUsers([first, second]);
    const result = await this.chats.createOrFind(first, second);
    return { chatId: result.chat.id, created: result.created };
  }

  async createGroup(creatorId: string, title: string, requestedMemberIds: string[]) {
    const memberIds = [...new Set([creatorId, ...requestedMemberIds])];
    if (memberIds.length < 3) {
      throw BusinessException.badRequest("A group chat requires at least three members");
    }
    await this.users.requireUserIds(memberIds);
    const chat = await this.chats.createGroup(creatorId, title, memberIds);
    return { chatId: chat.id, type: chat.type, title: chat.title, memberIds };
  }

  async renameGroup(chatId: string, actorId: string, title: string): Promise<{ success: true }> {
    await this.requireGroupOwner(chatId, actorId);
    await this.chats.renameGroup(chatId, title);
    return { success: true };
  }

  async addGroupMember(chatId: string, actorId: string, userId: string): Promise<{ added: boolean }> {
    await this.requireGroupOwner(chatId, actorId);
    await this.users.requireUser(userId);
    return { added: await this.chats.addMember(chatId, userId) };
  }

  async removeGroupMember(chatId: string, actorId: string, userId: string): Promise<{ removed: true }> {
    const chat = await this.requireGroupOwner(chatId, actorId);
    if (chat.ownerId === userId) throw BusinessException.badRequest("The group owner cannot be removed");
    const result = await this.chats.removeMemberKeepingMinimum(chatId, userId);
    if (result === "minimum") throw BusinessException.conflict("A group chat must keep at least three members");
    if (result === "not_found") throw BusinessException.notFound("Group member not found");
    return { removed: true };
  }

  async sendMessage(chatId: string, senderId: string, text: string): Promise<MessageResponse> {
    await this.requireParticipant(chatId, senderId);
    return this.messages.create(chatId, senderId, text);
  }

  async editMessage(chatId: string, messageId: string, senderId: string, text: string): Promise<MessageResponse> {
    await this.requireParticipant(chatId, senderId);
    await this.requireMessageOwner(chatId, messageId, senderId);
    return this.messages.edit(chatId, messageId, text);
  }

  async deleteMessage(chatId: string, messageId: string, senderId: string): Promise<MessageResponse> {
    await this.requireParticipant(chatId, senderId);
    await this.requireMessageOwner(chatId, messageId, senderId);
    return this.messages.deleteMessage(chatId, messageId);
  }

  async listMessages(chatId: string, limit: number): Promise<MessageResponse[]> {
    await this.requireChat(chatId);
    return this.messages.listNewestChronologically(chatId, limit);
  }

  async markRead(chatId: string, messageId: string, userId: string): Promise<{ success: true }> {
    await this.requireParticipant(chatId, userId);
    const message = await this.messages.find(chatId, messageId);
    if (!message) throw BusinessException.notFound("Message not found");
    if (message.senderId === userId) {
      throw BusinessException.forbidden("A sender cannot add a recipient read receipt to their own message");
    }
    await this.messages.markRead(chatId, messageId, userId);
    return { success: true };
  }

  async updateLastSeen(chatId: string, userId: string, messageId: string): Promise<LastSeenResponse> {
    await this.requireParticipant(chatId, userId);
    return this.messages.updateLastSeen(chatId, userId, messageId);
  }

  private async requireChat(chatId: string): Promise<ChatEntity> {
    const chat = await this.chats.findById(chatId);
    if (!chat) throw BusinessException.notFound("Chat not found");
    return chat;
  }

  private async requireParticipant(chatId: string, userId: string): Promise<ChatEntity> {
    const chat = await this.requireChat(chatId);
    if (!(await this.chats.isParticipant(chatId, userId))) {
      throw BusinessException.forbidden("User is not a participant in this chat");
    }
    return chat;
  }

  private async requireGroupOwner(chatId: string, userId: string): Promise<ChatEntity> {
    const chat = await this.requireParticipant(chatId, userId);
    if (chat.type !== "group") throw BusinessException.badRequest("Chat is not a group chat");
    if (chat.ownerId !== userId) throw BusinessException.forbidden("Only the group owner can manage the group");
    return chat;
  }

  private async requireMessageOwner(chatId: string, messageId: string, userId: string): Promise<void> {
    const message = await this.messages.find(chatId, messageId);
    if (!message) throw BusinessException.notFound("Message not found");
    if (message.senderId !== userId) throw BusinessException.forbidden("Only the sender can modify this message");
  }
}
