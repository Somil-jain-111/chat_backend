import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BusinessException } from "../../common/errors/business.exception";
import { ChatEntity } from "./chat.entity";

@Injectable()
export class ChatRepository {
  constructor(@InjectRepository(ChatEntity) private readonly chats: Repository<ChatEntity>) {}

  findById(id: string): Promise<ChatEntity | null> {
    return this.chats.findOneBy({ id });
  }

  findByParticipants(userAId: string, userBId: string): Promise<ChatEntity | null> {
    return this.chats.findOneBy({ userAId, userBId });
  }

  async createOrFind(userAId: string, userBId: string): Promise<{ chat: ChatEntity; created: boolean }> {
    const result = await this.chats
      .createQueryBuilder()
      .insert()
      .values({ userAId, userBId })
      .orIgnore("(user_a_id, user_b_id)")
      .returning("*")
      .execute();

    const chat = await this.findByParticipants(userAId, userBId);
    if (!chat) throw BusinessException.persistenceFailure("Unable to create or retrieve the chat");
    return { chat, created: result.raw.length > 0 };
  }

  findForUser(userId: string): Promise<ChatEntity[]> {
    return this.chats
      .createQueryBuilder("chat")
      .where("chat.userAId = :userId OR chat.userBId = :userId", { userId })
      .orderBy("chat.updatedAt", "DESC")
      .addOrderBy("chat.id", "ASC")
      .getMany();
  }
}
