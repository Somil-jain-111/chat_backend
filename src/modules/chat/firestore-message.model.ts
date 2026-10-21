export interface MessageResponse {
  messageId: string;
  senderId: string;
  text: string;
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  readBy: Record<string, string>;
}

export interface LastSeenResponse {
  userId: string;
  messageId: string;
  updatedAt: string;
}
