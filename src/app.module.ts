import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER, APP_PIPE } from "@nestjs/core";
import { ChatModule } from "./modules/chat/chat.module";
import { UserModule } from "./modules/user/user.module";
import { BusinessExceptionFilter } from "./common/errors/errorHandler";
import { SanitizePipe } from "./common/middleware/sanitize.middleware";
import { noCache } from "./common/middleware/noCache.middleware";
import { HealthController } from "./common/health.controller";
import { ConfigModule } from "./default/config/config.module";
import { SqlDbModule } from "./default/databases/mysql/sqldb.module";

@Module({
  imports: [ConfigModule, SqlDbModule, UserModule, ChatModule],
  providers: [
    { provide: APP_PIPE, useClass: SanitizePipe },
    { provide: APP_FILTER, useClass: BusinessExceptionFilter },
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(noCache()).forRoutes("chat", "user", "health");
  }
}
