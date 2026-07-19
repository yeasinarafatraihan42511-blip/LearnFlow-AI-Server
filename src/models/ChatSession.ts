import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IChatSession extends Document {
  userId: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  title: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ChatSessionSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    title: { type: String, required: true },
    messages: { type: [ChatMessageSchema], default: [] },
  },
  { timestamps: true }
);

export const ChatSessionModel = mongoose.models.ChatSession || mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
