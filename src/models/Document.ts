import mongoose, { Schema, Document } from 'mongoose';

export interface IDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt';
  fileUrl: string;
  rawText: string;
  summary?: string;
  keyPoints?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, enum: ['pdf', 'docx', 'txt'], required: true },
    fileUrl: { type: String, required: true },
    rawText: { type: String, required: true },
    summary: { type: String },
    keyPoints: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const DocumentModel = mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);
