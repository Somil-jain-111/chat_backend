import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatEntity, ChatMemberEntity } from "../chat/chat.entity";
import { ChatRepository } from "../chat/chat.repository";
import { UserController } from "./user.controller";
import { UserEntity } from "./user.entity";
import { UserRepository } from "./user.repository";
import { UserService } from "./user.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, ChatEntity, ChatMemberEntity])],
  controllers: [UserController],
  providers: [UserRepository, ChatRepository, UserService],
  exports: [UserRepository, UserService, ChatRepository],
})
export class UserModule {}
