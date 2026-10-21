import { ArgumentMetadata, Injectable, ValidationError, ValidationPipe } from "@nestjs/common";
import { BusinessException } from "../errors/business.exception";

function hasInvalidControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127;
  });
}

function sanitize(value: unknown): unknown {
  if (typeof value === "string") {
    if (hasInvalidControlCharacter(value)) {
      throw BusinessException.badRequest("Input contains unsupported control characters");
    }
    return value.trim();
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]));
  }
  return value;
}

@Injectable()
export class SanitizePipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) =>
        BusinessException.badRequest(
          "Validation failed",
          errors.map((error) => ({ field: error.property, messages: Object.values(error.constraints ?? {}) })),
        ),
    });
  }

  override transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    return super.transform(sanitize(value), metadata);
  }
}
