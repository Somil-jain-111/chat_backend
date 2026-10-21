import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "chats" })
@Unique("UQ_chats_participants", ["userAId", "userBId"])
@Check("CHK_chats_canonical_participants", '"user_a_id" < "user_b_id"')
@Index("IDX_chats_user_a", ["userAId"])
@Index("IDX_chats_user_b", ["userBId"])
export class ChatEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_a_id", type: "uuid" })
  userAId!: string;

  @Column({ name: "user_b_id", type: "uuid" })
  userBId!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
