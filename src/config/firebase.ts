import { Module } from "@nestjs/common";
import { App, applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { env } from "./env";

export const FIRESTORE = Symbol("FIRESTORE");

function firebaseApp(): App {
  const config = env();
  if (config.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = config.FIRESTORE_EMULATOR_HOST;
  }

  const existing = getApps()[0];
  if (existing) return existing;

  // The emulator is unauthenticated; constructing ADC here makes local writes
  // fail before the SDK can connect to it.
  if (config.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({ projectId: config.FIREBASE_PROJECT_ID });
  }

  const credential = config.FIREBASE_SERVICE_ACCOUNT_JSON
    ? cert(JSON.parse(config.FIREBASE_SERVICE_ACCOUNT_JSON) as object)
    : applicationDefault();
  return initializeApp({ credential, projectId: config.FIREBASE_PROJECT_ID });
}

@Module({
  providers: [{ provide: FIRESTORE, useFactory: (): Firestore => getFirestore(firebaseApp()) }],
  exports: [FIRESTORE],
})
export class FirebaseModule {}
