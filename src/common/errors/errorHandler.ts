import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { BusinessException } from "./business.exception";

@Catch()
export class BusinessExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(BusinessExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();
    const businessError = error instanceof BusinessException ? error : undefined;
    const httpError = error instanceof HttpException ? error : undefined;

    if (!businessError && !httpError) {
      this.logger.error({ method: request.method, path: request.path, error: error instanceof Error ? error.name : "UnknownError" });
    }

    const statusCode = businessError?.statusCode ?? httpError?.getStatus() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    response.status(statusCode).json({
      success: false,
      code: businessError?.code ?? (httpError ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR"),
      message: businessError?.message ?? (httpError ? "Invalid request" : "An unexpected error occurred"),
      errors: businessError?.errors ?? [],
    });
  }
}
