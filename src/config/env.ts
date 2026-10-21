import { config as loadDotenv } from "dotenv";
import Joi from "joi";

loadDotenv({ path: [`.env.${process.env.NODE_ENV ?? "development"}`, ".env"] });

export interface Environment {
  NODE_ENV: "development" | "test" | "production";
  PORT: number;
  CORS_ALLOWED_ORIGINS: string[];
  JSON_BODY_LIMIT: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
  FIRESTORE_EMULATOR_HOST?: string;
  FIRESTORE_OPERATION_TIMEOUT_MS: number;
}

const schema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().port().default(4000),
  CORS_ALLOWED_ORIGINS: Joi.string().default("http://localhost:3000"),
  JSON_BODY_LIMIT: Joi.string().pattern(/^\d+(kb|mb)$/i).default("100kb"),
  FIREBASE_PROJECT_ID: Joi.string().trim().min(1).default("chat-local"),
  FIREBASE_SERVICE_ACCOUNT_JSON: Joi.string().optional(),
  FIRESTORE_EMULATOR_HOST: Joi.when("NODE_ENV", {
    is: "production",
    then: Joi.string().optional(),
    otherwise: Joi.string().default("127.0.0.1:8080"),
  }),
  FIRESTORE_OPERATION_TIMEOUT_MS: Joi.number().integer().min(1000).max(30000).default(5000),
}).unknown(true);

let cachedEnvironment: Environment | undefined;

export function env(): Environment {
  if (cachedEnvironment) return cachedEnvironment;

  const { value, error } = schema.validate(process.env, { abortEarly: false });
  if (error) throw new Error(`Invalid environment configuration: ${error.message}`);

  const raw = value as Record<string, unknown>;
  cachedEnvironment = {
    NODE_ENV: raw.NODE_ENV as Environment["NODE_ENV"],
    PORT: Number(raw.PORT),
    CORS_ALLOWED_ORIGINS: String(raw.CORS_ALLOWED_ORIGINS)
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    JSON_BODY_LIMIT: String(raw.JSON_BODY_LIMIT),
    FIREBASE_PROJECT_ID: String(raw.FIREBASE_PROJECT_ID),
    ...(raw.FIREBASE_SERVICE_ACCOUNT_JSON
      ? { FIREBASE_SERVICE_ACCOUNT_JSON: String(raw.FIREBASE_SERVICE_ACCOUNT_JSON) }
      : {}),
    ...(raw.FIRESTORE_EMULATOR_HOST
      ? { FIRESTORE_EMULATOR_HOST: String(raw.FIRESTORE_EMULATOR_HOST) }
      : {}),
    FIRESTORE_OPERATION_TIMEOUT_MS: Number(raw.FIRESTORE_OPERATION_TIMEOUT_MS),
  };
  return cachedEnvironment;
}
