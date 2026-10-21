import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { BusinessException } from "../../common/errors/business.exception";
import { ChatEntity, ChatMemberEntity } from "./chat.entity";

export interface UserChatRecord {
  chat: ChatEntity;
  memberIds: string[];
}

@Injectable()
export class ChatRepository {
  constructor(
    @InjectRepository(ChatEntity) private readonly chats: Repository<ChatEntity>,
    @InjectRepository(ChatMemberEntity) private readonly members: Repository<ChatMemberEntity>,
    private readonly dataSource: DataSource,
  ) {}

  findById(id: string): Promise<ChatEntity | null> {
    return this.chats.findOneBy({ id });
  }

  findByParticipants(userAId: string, userBId: string): Promise<ChatEntity | null> {
    return this.chats.findOneBy({ userAId, userBId });
  }

  async createOrFind(userAId: string, userBId: string): Promise<{ chat: ChatEntity; created: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const chats = manager.getRepository(ChatEntity);
      const result = await chats
        .createQueryBuilder()
        .insert()
        .values({ userAId, userBId, type: "direct" })
        .orIgnore("(user_a_id, user_b_id)")
        .returning("*")
        .execute();

      const chat = await chats.findOneBy({ userAId, userBId });
      if (!chat) throw BusinessException.persistenceFailure("Unable to create or retrieve the chat");
      await manager
        .getRepository(ChatMemberEntity)
        .createQueryBuilder()
        .insert()
        .values([
          { chatId: chat.id, userId: userAId, role: "member" },
          { chatId: chat.id, userId: userBId, role: "member" },
        ])
        .orIgnore()
        .execute();
      return { chat, created: result.raw.length > 0 };
    });
  }

  async createGroup(ownerId: string, title: string, memberIds: string[]): Promise<ChatEntity> {
    return this.dataSource.transaction(async (manager) => {
      const chat = await manager.getRepository(ChatEntity).save({
        type: "group",
        title,
        ownerId,
        userAId: null,
        userBId: null,
      });
      await manager.getRepository(ChatMemberEntity).insert(
        memberIds.map((userId) => ({
          chatId: chat.id,
          userId,
          role: userId === ownerId ? "owner" : "member",
        })),
      );
      return chat;
    });
  }

  async renameGroup(chatId: string, title: string): Promise<void> {
    await this.chats.update({ id: chatId, type: "group" }, { title });
  }

  async addMember(chatId: string, userId: string): Promise<boolean> {
    const result = await this.members
      .createQueryBuilder()
      .insert()
      .values({ chatId, userId, role: "member" })
      .orIgnore()
      .returning("chat_id")
      .execute();
    return result.raw.length > 0;
  }

  removeMemberKeepingMinimum(chatId: string, userId: string): Promise<"removed" | "not_found" | "minimum"> {
    return this.dataSource.transaction(async (manager) => {
      await manager.getRepository(ChatEntity).findOne({
        where: { id: chatId },
        lock: { mode: "pessimistic_write" },
      });
      const members = manager.getRepository(ChatMemberEntity);
      if ((await members.countBy({ chatId })) <= 3) return "minimum";
      const result = await members.delete({ chatId, userId });
      return (result.affected ?? 0) > 0 ? "removed" : "not_found";
    });
  }

  isParticipant(chatId: string, userId: string): Promise<boolean> {
    return this.members.existsBy({ chatId, userId });
  }

  async findForUser(userId: string): Promise<UserChatRecord[]> {
    const chats = await this.chats
      .createQueryBuilder("chat")
      .innerJoin(ChatMemberEntity, "membership", "membership.chatId = chat.id AND membership.userId = :userId", {
        userId,
      })
      .orderBy("chat.updatedAt", "DESC")
      .addOrderBy("chat.id", "ASC")
      .getMany();
    if (chats.length === 0) return [];

    const rows = await this.members
      .createQueryBuilder("member")
      .where("member.chatId IN (:...chatIds)", { chatIds: chats.map(({ id }) => id) })
      .orderBy("member.joinedAt", "ASC")
      .addOrderBy("member.userId", "ASC")
      .getMany();
    const memberIds = new Map<string, string[]>();
    for (const row of rows) {
      const ids = memberIds.get(row.chatId) ?? [];
      ids.push(row.userId);
      memberIds.set(row.chatId, ids);
    }
    return chats.map((chat) => ({ chat, memberIds: memberIds.get(chat.id) ?? [] }));
  }
}
