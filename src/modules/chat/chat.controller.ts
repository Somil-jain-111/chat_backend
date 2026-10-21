import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { ChatService } from "./chat.service";
import {
  AddGroupMemberDto,
  CreateChatDto,
  CreateGroupChatDto,
  DeleteMessageDto,
  EditMessageDto,
  LastSeenDto,
  ManageGroupDto,
  MessageIdPipe,
  MessageListQueryDto,
  ReadMessageDto,
  RenameGroupDto,
  SendMessageDto,
} from "./chat.dto";

@Controller("chat")
export class ChatController {
  constructor(private readonly chats: ChatService) {}

  @Post("create")
  async create(@Body() body: CreateChatDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.chats.create(body.userAId, body.userBId);
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return { chatId: result.chatId };
  }

  @Post("group")
  createGroup(@Body() body: CreateGroupChatDto) {
    return this.chats.createGroup(body.creatorId, body.title, body.memberIds);
  }

  @Patch(":chatId/group")
  renameGroup(
    @Param("chatId", new ParseUUIDPipe({ version: "4" })) chatId: string,
    @Body() body: RenameGroupDto,
  ) {
    return this.chats.renameGroup(chatId, body.actorId, body.title);
  }

  @Post(":chatId/group/members")
  addGroupMember(
    @Param("chatId", new ParseUUIDPipe({ version: "4" })) chatId: string,
    @Body() body: AddGroupMemberDto,
  ) {
    return this.chats.addGroupMember(chatId, body.actorId, body.userId);
  }

  @Delete(":chatId/group/members/:userId")
  removeGroupMember(
    @Param("chatId", new ParseUUIDPipe({ version: "4" })) chatId: string,
    @Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string,
    @Body() body: ManageGroupDto,
  ) {
    return this.chats.removeGroupMember(chatId, body.actorId, userId);
  }

  @Post(":chatId/message/send")
  async send(
    @Param("chatId", new ParseUUIDPipe({ version: "4" })) chatId: string,
    @Body() body: SendMessageDto,
  ) {
    return this.chats.sendMessage(chatId, body.senderId, body.text);
  }

  @Patch(":chatId/message/:messageId")
  editMessage(
    @Param("chatId", new ParseUUIDPipe({ version: "4" })) chatId: string,
    @Param("messageId", MessageIdPipe) messageId: string,
    @Body() body: EditMessageDto,
  ) {
    return this.chats.editMessage(chatId, messageId, body.senderId, body.text);
  }

  @Delete(":chatId/message/:messageId")
  deleteMessage(
    @Param("chatId", new ParseUUIDPipe({ version: "4" })) chatId: string,
    @Param("messageId", MessageIdPipe) messageId: string,
    @Body() body: DeleteMessageDto,
  ) {
    return this.chats.deleteMessage(chatId, messageId, body.senderId);
  }

  @Get(":chatId/messages")
  list(
    @Param("chatId", new ParseUUIDPipe({ version: "4" })) chatId: string,
    @Query() query: MessageListQueryDto,
  ) {
    return this.chats.listMessages(chatId, query.limit);
  }

  @Post(":chatId/message/:messageId/read")
  @HttpCode(HttpStatus.OK)
  markRead(
    @Param("chatId", new ParseUUIDPipe({ version: "4" })) chatId: string,
    @Param("messageId", MessageIdPipe) messageId: string,
    @Body() body: ReadMessageDto,
  ) {
    return this.chats.markRead(chatId, messageId, body.userId);
  }

  @Post(":chatId/lastseen")
  @HttpCode(HttpStatus.OK)
  updateLastSeen(
    @Param("chatId", new ParseUUIDPipe({ version: "4" })) chatId: string,
    @Body() body: LastSeenDto,
  ) {
    return this.chats.updateLastSeen(chatId, body.userId, body.messageId);
  }
}
