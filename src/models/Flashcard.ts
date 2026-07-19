import mongoose, { Schema, Document } from 'mongoose';

export interface IFlashcard extends Document {
  userId: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  front: string;
  back: string;
  box: number; // 1 to 5 for spaced repetition boxes
  nextReview: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    box: { type: Number, default: 1, min: 1, max: 5 },
    nextReview: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

export const FlashcardModel = mongoose.models.Flashcard || mongoose.model<IFlashcard>('Flashcard', FlashcardSchema);
