import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { env } from "./config/env";

async function bootstrap(): Promise<void> {
  const config = env();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableShutdownHooks();
  app.use(helmet());
  app.useBodyParser("json", { limit: config.JSON_BODY_LIMIT });
  app.enableCors({
    origin: config.CORS_ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  });

  await app.listen(config.PORT, "0.0.0.0");
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown startup error";
  console.error(`Application failed to start: ${message}`);
  process.exit(1);
});
