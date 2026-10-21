import type { RequestHandler } from "express";
import nocache from "nocache";

export function noCache(): RequestHandler {
  return nocache();
}
