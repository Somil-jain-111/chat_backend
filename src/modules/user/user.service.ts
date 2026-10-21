import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/errors/business.exception";
import { ChatRepository } from "../chat/chat.repository";
import { UserRepository } from "./user.repository";

export interface UserChatResponse {
  chatId: string;
  type: "direct" | "group";
  title: string | null;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly chats: ChatRepository,
  ) {}

  async requireUser(id: string): Promise<void> {
    if (!(await this.users.findById(id))) throw BusinessException.notFound("User not found");
  }

  async requireUsers(ids: [string, string]): Promise<void> {
    await this.requireUserIds(ids);
  }

  async requireUserIds(ids: string[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];
    if ((await this.users.findByIds(uniqueIds)).length !== uniqueIds.length) {
      throw BusinessException.notFound("One or more users were not found");
    }
  }

  async listChats(userId: string): Promise<UserChatResponse[]> {
    await this.requireUser(userId);
    return (await this.chats.findForUser(userId)).map(({ chat, memberIds }) => ({
      chatId: chat.id,
      type: chat.type,
      title: chat.title,
      memberIds,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    }));
  }
}
