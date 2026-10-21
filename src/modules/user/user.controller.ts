import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { UserService } from "./user.service";

@Controller("user")
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get(":userId/chats")
  listChats(@Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string) {
    return this.users.listChats(userId);
  }
}
