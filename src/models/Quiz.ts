import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface IQuizSubmission {
  score: number;
  answers: number[]; // User selected indices
  takenAt: Date;
}

export interface IQuiz extends Document {
  userId: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  title: string;
  questions: IQuizQuestion[];
  submissions: IQuizSubmission[];
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctIndex: { type: Number, required: true },
  explanation: { type: String, required: true },
});

const QuizSubmissionSchema = new Schema({
  score: { type: Number, required: true },
  answers: { type: [Number], required: true },
  takenAt: { type: Date, default: Date.now },
});

const QuizSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    title: { type: String, required: true },
    questions: { type: [QuizQuestionSchema], default: [] },
    submissions: { type: [QuizSubmissionSchema], default: [] },
  },
  { timestamps: true }
);

export const QuizModel = mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);
