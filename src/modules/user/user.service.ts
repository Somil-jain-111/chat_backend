import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/errors/business.exception";
import { ChatRepository } from "../chat/chat.repository";
import { UserRepository } from "./user.repository";

export interface UserChatResponse {
  chatId: string;
  memberIds: [string, string];
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
    if ((await this.users.findByIds(ids)).length !== 2) {
      throw BusinessException.notFound("One or more users were not found");
    }
  }

  async listChats(userId: string): Promise<UserChatResponse[]> {
    await this.requireUser(userId);
    return (await this.chats.findForUser(userId)).map((chat) => ({
      chatId: chat.id,
      memberIds: [chat.userAId, chat.userBId],
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    }));
  }
}
