import { Injectable, PipeTransform } from "@nestjs/common";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { BusinessException } from "../../common/errors/business.exception";

export class CreateChatDto {
  @IsUUID("4")
  userAId!: string;

  @IsUUID("4")
  userBId!: string;
}

export class SendMessageDto {
  @IsUUID("4")
  senderId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text!: string;
}

export class CreateGroupChatDto {
  @IsUUID("4")
  creatorId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayUnique()
  @IsUUID("4", { each: true })
  memberIds!: string[];
}

export class ManageGroupDto {
  @IsUUID("4")
  actorId!: string;
}

export class RenameGroupDto extends ManageGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;
}

export class AddGroupMemberDto extends ManageGroupDto {
  @IsUUID("4")
  userId!: string;
}

export class EditMessageDto extends SendMessageDto {}

export class DeleteMessageDto {
  @IsUUID("4")
  senderId!: string;
}

export class ReadMessageDto {
  @IsUUID("4")
  userId!: string;
}

export class LastSeenDto extends ReadMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  messageId!: string;
}

export class MessageListQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

@Injectable()
export class MessageIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || value.length > 200 || value.includes("/")) {
      throw BusinessException.badRequest("Invalid message ID");
    }
    return value;
  }
}
