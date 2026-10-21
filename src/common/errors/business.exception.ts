import { HttpStatus } from "@nestjs/common";

export class BusinessException extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly errors: unknown[] = [],
  ) {
    super(message);
    this.name = "BusinessException";
  }

  static badRequest(message: string, errors: unknown[] = []): BusinessException {
    return new BusinessException(message, HttpStatus.BAD_REQUEST, "BAD_REQUEST", errors);
  }

  static forbidden(message: string): BusinessException {
    return new BusinessException(message, HttpStatus.FORBIDDEN, "FORBIDDEN");
  }

  static notFound(message: string): BusinessException {
    return new BusinessException(message, HttpStatus.NOT_FOUND, "NOT_FOUND");
  }

  static conflict(message: string): BusinessException {
    return new BusinessException(message, HttpStatus.CONFLICT, "CONFLICT");
  }

  static dependencyFailure(): BusinessException {
    return new BusinessException(
      "Message storage is temporarily unavailable",
      HttpStatus.INTERNAL_SERVER_ERROR,
      "MESSAGE_STORE_ERROR",
    );
  }

  static persistenceFailure(message: string): BusinessException {
    return new BusinessException(message, HttpStatus.INTERNAL_SERVER_ERROR, "PERSISTENCE_ERROR");
  }
}
