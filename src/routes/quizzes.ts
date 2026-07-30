import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { generateQuiz } from '../services/ai.js';
import { QuizModel } from '../models/Quiz.js';
import { DocumentModel } from '../models/Document.js';

const router = Router();

// router.use(requireAuth);

// @route   GET /api/v1/quizzes/document/:id
// @desc    Get quiz for a document (generate if none exist)
router.get('/document/:id', async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.user?.id as string;
    const documentId = req.params.id as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let quiz = await QuizModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      documentId: new mongoose.Types.ObjectId(documentId),
    });

    if (!quiz) {
      const doc = await DocumentModel.findOne({
        _id: new mongoose.Types.ObjectId(documentId),
        userId: new mongoose.Types.ObjectId(userId),
      });

      if (!doc) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }

      const generatedQuestions = await generateQuiz(doc.rawText);

      quiz = new QuizModel({
        userId: new mongoose.Types.ObjectId(userId),
        documentId: new mongoose.Types.ObjectId(documentId),
        title: `${doc.title} Quiz`,
        questions: generatedQuestions,
        submissions: [],
      });

      await quiz.save();
    }

    res.json({ success: true, data: quiz });
  } catch (error: any) {
    console.error('❌ Quiz retrieval error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/v1/quizzes/document/:id
// @desc    Force generate a new quiz
router.post('/document/:id', async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.user?.id as string;
    const documentId = req.params.id as string;

    const doc = await DocumentModel.findOne({
      _id: new mongoose.Types.ObjectId(documentId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const generatedQuestions = await generateQuiz(doc.rawText);

    // Delete existing quiz
    await QuizModel.deleteMany({
      userId: new mongoose.Types.ObjectId(userId),
      documentId: new mongoose.Types.ObjectId(documentId),
    });

    const quiz = new QuizModel({
      userId: new mongoose.Types.ObjectId(userId),
      documentId: new mongoose.Types.ObjectId(documentId),
      title: `${doc.title} Quiz`,
      questions: generatedQuestions,
      submissions: [],
    });

    await quiz.save();

    res.status(201).json({ success: true, data: quiz });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/v1/quizzes/:quizId/submit
// @desc    Submit score and answers for grading records
router.post('/:quizId/submit', async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.user?.id as string;
    const { score, answers } = req.body; // score as percentage, answers as array of choices
    const quizId = req.params.quizId as string;

    const quiz = await QuizModel.findOne({
      _id: new mongoose.Types.ObjectId(quizId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Append submission
    const newSubmission = {
      score: Number(score),
      answers: answers.map(Number),
      takenAt: new Date(),
    };

    quiz.submissions.push(newSubmission);
    await quiz.save();

    res.json({ success: true, data: quiz });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
