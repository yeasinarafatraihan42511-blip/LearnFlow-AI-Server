import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  userId: string;
  token: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

export const SessionModel = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
