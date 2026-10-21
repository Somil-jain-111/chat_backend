import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { UserEntity } from "../user/user.entity";

@Entity({ name: "chats" })
@Unique("UQ_chats_participants", ["userAId", "userBId"])
@Check("CHK_chats_canonical_participants", '"user_a_id" < "user_b_id"')
@Check(
  "CHK_chats_type",
  `("type" = 'direct' AND "user_a_id" IS NOT NULL AND "user_b_id" IS NOT NULL AND "owner_id" IS NULL) OR ("type" = 'group' AND "user_a_id" IS NULL AND "user_b_id" IS NULL AND "owner_id" IS NOT NULL AND length(trim("title")) > 0)`,
)
@Index("IDX_chats_user_a", ["userAId"])
@Index("IDX_chats_user_b", ["userBId"])
export class ChatEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_a_id", type: "uuid", nullable: true })
  userAId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT", nullable: true })
  @JoinColumn({ name: "user_a_id", foreignKeyConstraintName: "FK_chats_user_a" })
  userA?: UserEntity | null;

  @Column({ name: "user_b_id", type: "uuid", nullable: true })
  userBId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT", nullable: true })
  @JoinColumn({ name: "user_b_id", foreignKeyConstraintName: "FK_chats_user_b" })
  userB?: UserEntity | null;

  @Column({ type: "varchar", length: 16, default: "direct" })
  type!: "direct" | "group";

  @Column({ type: "varchar", length: 120, nullable: true })
  title!: string | null;

  @Column({ name: "owner_id", type: "uuid", nullable: true })
  ownerId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT", nullable: true })
  @JoinColumn({ name: "owner_id", foreignKeyConstraintName: "FK_chats_owner" })
  owner?: UserEntity | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

@Entity({ name: "chat_members" })
@Index("IDX_chat_members_user", ["userId"])
@Check("CHK_chat_members_role", `"role" IN ('owner', 'member')`)
export class ChatMemberEntity {
  @Column({ name: "chat_id", type: "uuid", primary: true })
  chatId!: string;

  @ManyToOne(() => ChatEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "chat_id", foreignKeyConstraintName: "FK_chat_members_chat" })
  chat?: ChatEntity;

  @Column({ name: "user_id", type: "uuid", primary: true })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: "FK_chat_members_user" })
  user?: UserEntity;

  @Column({ type: "varchar", length: 16, default: "member" })
  role!: "owner" | "member";

  @CreateDateColumn({ name: "joined_at", type: "timestamptz" })
  joinedAt!: Date;
}
