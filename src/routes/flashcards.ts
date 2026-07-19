import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { generateFlashcards } from '../services/ai.js';
import { FlashcardModel } from '../models/Flashcard.js';
import { DocumentModel } from '../models/Document.js';

const router = Router();

router.use(requireAuth);

// @route   GET /api/v1/flashcards/document/:id
// @desc    Get flashcards for a document (generate if none exist)
router.get('/document/:id', async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.user?.id as string;
    const documentId = req.params.id as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // 1. Check if flashcards already exist
    let cards = await FlashcardModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      documentId: new mongoose.Types.ObjectId(documentId),
    });

    // 2. If no cards exist, generate them using Gemini
    if (cards.length === 0) {
      const doc = await DocumentModel.findOne({
        _id: new mongoose.Types.ObjectId(documentId),
        userId: new mongoose.Types.ObjectId(userId),
      });

      if (!doc) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }

      const generated = await generateFlashcards(doc.rawText);

      // Save to database
      const cardDocs = generated.map((c) => ({
        userId: new mongoose.Types.ObjectId(userId),
        documentId: new mongoose.Types.ObjectId(documentId),
        front: c.front,
        back: c.back,
        box: 1,
        nextReview: new Date(),
      }));

      if (cardDocs.length > 0) {
        cards = await FlashcardModel.insertMany(cardDocs);
      }
    }

    res.json({ success: true, data: cards });
  } catch (error: any) {
    console.error('❌ Flashcard retrieval error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/v1/flashcards/document/:id
// @desc    Force regenerate/create flashcards
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

    const generated = await generateFlashcards(doc.rawText);

    // Delete existing ones
    await FlashcardModel.deleteMany({
      userId: new mongoose.Types.ObjectId(userId),
      documentId: new mongoose.Types.ObjectId(documentId),
    });

    const cardDocs = generated.map((c) => ({
      userId: new mongoose.Types.ObjectId(userId),
      documentId: new mongoose.Types.ObjectId(documentId),
      front: c.front,
      back: c.back,
      box: 1,
      nextReview: new Date(),
    }));

    let cards = [];
    if (cardDocs.length > 0) {
      cards = await FlashcardModel.insertMany(cardDocs);
    }

    res.status(201).json({ success: true, data: cards });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/v1/flashcards/:cardId/review
// @desc    Update Leitner spaced repetition review progress
router.post('/:cardId/review', async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.user?.id as string;
    const { rating } = req.body; // 'easy' | 'medium' | 'hard'
    const cardId = req.params.cardId as string;

    if (!['easy', 'medium', 'hard'].includes(rating)) {
      return res.status(400).json({ success: false, message: 'Invalid rating value' });
    }

    const card = await FlashcardModel.findOne({
      _id: new mongoose.Types.ObjectId(cardId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!card) {
      return res.status(404).json({ success: false, message: 'Flashcard not found' });
    }

    // Adjust box level
    if (rating === 'easy') {
      card.box = Math.min(5, card.box + 1);
    } else if (rating === 'hard') {
      card.box = 1;
    } // Medium stays in the same box

    // Calculate next review interval based on box
    const daysToAddMap: Record<number, number> = {
      1: 1,  // 1 day
      2: 3,  // 3 days
      3: 7,  // 7 days
      4: 14, // 14 days
      5: 30, // 30 days
    };

    const days = daysToAddMap[card.box] || 1;
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + days);
    
    card.nextReview = nextReviewDate;
    await card.save();

    res.json({ success: true, data: card });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
