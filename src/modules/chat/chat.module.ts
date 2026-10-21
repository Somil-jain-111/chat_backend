import { Module } from "@nestjs/common";
import { FirebaseModule } from "../../config/firebase";
import { UserModule } from "../user/user.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { FirestoreMessageRepository } from "./firestore-message.repository";

@Module({
  imports: [UserModule, FirebaseModule],
  controllers: [ChatController],
  providers: [ChatService, FirestoreMessageRepository],
})
export class ChatModule {}
