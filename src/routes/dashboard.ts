import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { DocumentModel } from '../models/Document.js';
import { FlashcardModel } from '../models/Flashcard.js';
import { QuizModel } from '../models/Quiz.js';

const router = Router();

router.use(requireAuth);

// @route   GET /api/v1/dashboard/stats
// @desc    Retrieve user stats (counts, quiz history, spaced repetition boxes)
router.get('/stats', async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.user?.id as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1. Core counts
    const totalDocuments = await DocumentModel.countDocuments({ userId: userObjectId });
    const totalFlashcards = await FlashcardModel.countDocuments({ userId: userObjectId });
    const totalQuizzes = await QuizModel.countDocuments({ userId: userObjectId });

    // 2. Spaced repetition box distribution
    const cardsByBox = await FlashcardModel.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: '$box', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Format box counts as a standard 1-5 array (ensure box indices are consistent)
    const boxDistribution = Array.from({ length: 5 }, (_, idx) => {
      const boxNum = idx + 1;
      const match = cardsByBox.find((item) => item._id === boxNum);
      return { box: boxNum, count: match ? match.count : 0 };
    });

    // 3. Quiz score history over time
    const quizzes = await QuizModel.find({ userId: userObjectId })
      .select('title submissions')
      .lean();

    const quizSubmissions = quizzes
      .flatMap((q) =>
        q.submissions.map((sub: any) => ({
          quizTitle: q.title,
          score: sub.score,
          takenAt: sub.takenAt,
        })),
      )
      .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime()) // Chronological order
      .slice(-10); // Limit to last 10 attempts for charts

    // 4. Recent documents uploaded
    const recentDocuments = await DocumentModel.find({ userId: userObjectId })
      .select('title fileType createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        stats: {
          totalDocuments,
          totalFlashcards,
          totalQuizzes,
        },
        boxDistribution,
        quizSubmissions,
        recentDocuments,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
