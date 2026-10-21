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

  async sendMessage(chatId: string, senderId: string, text: string): Promise<MessageResponse> {
    await this.requireParticipant(chatId, senderId);
    return this.messages.create(chatId, senderId, text);
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
    if (chat.userAId !== userId && chat.userBId !== userId) {
      throw BusinessException.forbidden("User is not a participant in this chat");
    }
    return chat;
  }
}
