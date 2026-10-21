import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { UserEntity } from "./user.entity";

@Injectable()
export class UserRepository {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>) {}

  findById(id: string): Promise<UserEntity | null> {
    return this.users.findOneBy({ id });
  }

  findByIds(ids: string[]): Promise<UserEntity[]> {
    return this.users.findBy({ id: In(ids) });
  }
}
