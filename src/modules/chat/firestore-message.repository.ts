import { Inject, Injectable } from "@nestjs/common";
import {
  DocumentSnapshot,
  FieldPath,
  FieldValue,
  Firestore,
  Timestamp,
} from "firebase-admin/firestore";
import { BusinessException } from "../../common/errors/business.exception";
import { FIRESTORE } from "../../config/firebase";
import { env } from "../../config/env";
import { LastSeenResponse, MessageResponse } from "./firestore-message.model";

interface MessageDocument {
  senderId: string;
  text: string;
  createdAt: Timestamp;
  editedAt?: Timestamp;
  deletedAt?: Timestamp;
  readBy?: Record<string, Timestamp>;
}

interface LastSeenDocument {
  userId: string;
  messageId: string;
  updatedAt: Timestamp;
}

function timestampOrder(left: Timestamp, leftId: string, right: Timestamp, rightId: string): number {
  if (left.seconds !== right.seconds) return left.seconds - right.seconds;
  if (left.nanoseconds !== right.nanoseconds) return left.nanoseconds - right.nanoseconds;
  return leftId.localeCompare(rightId);
}

@Injectable()
export class FirestoreMessageRepository {
  constructor(@Inject(FIRESTORE) private readonly firestore: Firestore) {}

  async create(chatId: string, senderId: string, text: string): Promise<MessageResponse> {
    return this.mapFailures(async () => {
      const reference = this.messages(chatId).doc();
      await reference.set({ senderId, text, createdAt: FieldValue.serverTimestamp(), readBy: {} });
      return this.toMessage(await reference.get());
    });
  }

  async listNewestChronologically(chatId: string, limit: number): Promise<MessageResponse[]> {
    return this.mapFailures(async () => {
      const snapshot = await this.messages(chatId)
        .orderBy("createdAt", "desc")
        .orderBy(FieldPath.documentId(), "desc")
        .limit(limit)
        .get();
      return snapshot.docs.map((document) => this.toMessage(document)).reverse();
    });
  }

  async find(chatId: string, messageId: string): Promise<MessageResponse | null> {
    return this.mapFailures(async () => {
      const snapshot = await this.messages(chatId).doc(messageId).get();
      return snapshot.exists ? this.toMessage(snapshot) : null;
    });
  }

  async edit(chatId: string, messageId: string, text: string): Promise<MessageResponse> {
    return this.mapFailures(async () => {
      const reference = this.messages(chatId).doc(messageId);
      await this.firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) throw BusinessException.notFound("Message not found");
        if (this.messageData(snapshot).deletedAt) {
          throw BusinessException.conflict("Deleted messages cannot be edited");
        }
        transaction.update(reference, { text, editedAt: FieldValue.serverTimestamp() });
      });
      return this.toMessage(await reference.get());
    });
  }

  async deleteMessage(chatId: string, messageId: string): Promise<MessageResponse> {
    return this.mapFailures(async () => {
      const reference = this.messages(chatId).doc(messageId);
      await this.firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) throw BusinessException.notFound("Message not found");
        if (this.messageData(snapshot).deletedAt) return;
        transaction.update(reference, { text: "", deletedAt: FieldValue.serverTimestamp() });
      });
      return this.toMessage(await reference.get());
    });
  }

  async markRead(chatId: string, messageId: string, userId: string): Promise<boolean> {
    return this.mapFailures(() =>
      this.firestore.runTransaction(async (transaction) => {
        const reference = this.messages(chatId).doc(messageId);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) throw BusinessException.notFound("Message not found");
        const message = this.messageData(snapshot);
        if (message.readBy?.[userId]) return false;
        transaction.update(reference, new FieldPath("readBy", userId), FieldValue.serverTimestamp());
        return true;
      }),
    );
  }

  async updateLastSeen(chatId: string, userId: string, messageId: string): Promise<LastSeenResponse> {
    return this.mapFailures(async () => {
      const stateReference = this.firestore.doc(`chats/${chatId}/lastSeen/${userId}`);
      await this.firestore.runTransaction(async (transaction) => {
        const messageReference = this.messages(chatId).doc(messageId);
        const [message, currentState] = await Promise.all([
          transaction.get(messageReference),
          transaction.get(stateReference),
        ]);
        if (!message.exists) throw BusinessException.notFound("Message not found");

        if (currentState.exists) {
          const current = currentState.data() as LastSeenDocument;
          const currentMessage = await transaction.get(this.messages(chatId).doc(current.messageId));
          if (
            currentMessage.exists &&
            timestampOrder(
              this.messageData(message).createdAt,
              message.id,
              this.messageData(currentMessage).createdAt,
              currentMessage.id,
            ) < 0
          ) {
            return;
          }
        }

        transaction.set(stateReference, {
          userId,
          messageId,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      return this.toLastSeen(await stateReference.get());
    });
  }

  private messages(chatId: string) {
    return this.firestore.collection(`chats/${chatId}/messages`);
  }

  private messageData(snapshot: DocumentSnapshot): MessageDocument {
    const data = snapshot.data();
    if (
      !data ||
      typeof data.senderId !== "string" ||
      typeof data.text !== "string" ||
      !(data.createdAt instanceof Timestamp)
    ) {
      throw BusinessException.dependencyFailure();
    }
    return data as MessageDocument;
  }

  private toMessage(snapshot: DocumentSnapshot): MessageResponse {
    const data = this.messageData(snapshot);
    return {
      messageId: snapshot.id,
      senderId: data.senderId,
      text: data.text,
      createdAt: data.createdAt.toDate().toISOString(),
      ...(data.editedAt ? { editedAt: data.editedAt.toDate().toISOString() } : {}),
      ...(data.deletedAt ? { deletedAt: data.deletedAt.toDate().toISOString() } : {}),
      readBy: Object.fromEntries(
        Object.entries(data.readBy ?? {}).map(([userId, readAt]) => [userId, readAt.toDate().toISOString()]),
      ),
    };
  }

  private toLastSeen(snapshot: DocumentSnapshot): LastSeenResponse {
    const data = snapshot.data() as LastSeenDocument | undefined;
    if (!data || !(data.updatedAt instanceof Timestamp)) throw BusinessException.dependencyFailure();
    return { userId: data.userId, messageId: data.messageId, updatedAt: data.updatedAt.toDate().toISOString() };
  }

  private async mapFailures<T>(operation: () => Promise<T>): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutFailure = new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(BusinessException.dependencyFailure()),
          env().FIRESTORE_OPERATION_TIMEOUT_MS,
        );
      });
      return await Promise.race([operation(), timeoutFailure]);
    } catch (error) {
      if (error instanceof BusinessException) throw error;
      throw BusinessException.dependencyFailure();
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
