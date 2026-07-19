import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { parseDocument } from '../services/parser.js';
import { generateInsights } from '../services/ai.js';
import { DocumentModel } from '../models/Document.js';
import { FlashcardModel } from '../models/Flashcard.js';
import { QuizModel } from '../models/Quiz.js';
import { ChatSessionModel } from '../models/ChatSession.js';

const router = Router();

// Apply auth middleware to all document routes
router.use(requireAuth);

// @route   POST /api/v1/documents
// @desc    Upload document, parse text, generate insights, and save
router.post('/', upload.single('file'), async (req: AuthenticatedRequest, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User context not found' });
    }

    // Determine type
    let fileType: 'pdf' | 'docx' | 'txt' = 'txt';
    if (mimetype === 'application/pdf') {
      fileType = 'pdf';
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      fileType = 'docx';
    }

    // 1. Parse text from buffer
    const rawText = await parseDocument(buffer, mimetype);
    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract text from document. Ensure it is not empty or scanned image.',
      });
    }

    // 2. Generate insights (Summary & key points)
    const insights = await generateInsights(rawText);

    // 3. Save Document to database
    const document = new DocumentModel({
      userId: new mongoose.Types.ObjectId(userId),
      title: originalname.replace(/\.[^/.]+$/, ''), // Strip file extension
      fileName: originalname,
      fileType,
      fileUrl: `memory://${originalname}`, // In-memory signifier
      rawText,
      summary: insights.summary,
      keyPoints: insights.keyPoints,
    });

    await document.save();

    res.status(201).json({
      success: true,
      data: document,
    });
  } catch (error: any) {
    console.error('❌ Document Upload Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error uploading file' });
  }
});

// @route   GET /api/v1/documents
// @desc    Get all user documents (supports simple search)
router.get('/', async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.user?.id;
    const search = req.query.search as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const query: any = { userId: new mongoose.Types.ObjectId(userId) };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const documents = await DocumentModel.find(query)
      .select('-rawText') // Exclude raw text for listing speed
      .sort({ createdAt: -1 });

    res.json({ success: true, data: documents });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/v1/documents/:id
// @desc    Get document details
router.get('/:id', async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.user?.id;
    const document = await DocumentModel.findOne({
      _id: req.params.id,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    res.json({ success: true, data: document });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/v1/documents/:id
// @desc    Delete document and clean up cascade relations (quizzes, flashcards, chats)
router.delete('/:id', async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.user?.id;
    const docId = req.params.id;

    const doc = await DocumentModel.findOneAndDelete({
      _id: docId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Cascade delete relations
    await FlashcardModel.deleteMany({ documentId: docId });
    await QuizModel.deleteMany({ documentId: docId });
    await ChatSessionModel.deleteMany({ documentId: docId });

    res.json({ success: true, message: 'Document and associated study elements deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/v1/documents/:id/insights
// @desc    Regenerate insights if missing
router.get('/:id/insights', async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.user?.id;
    const document = await DocumentModel.findOne({
      _id: req.params.id,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (!document.summary || document.summary.includes('Failed')) {
      const insights = await generateInsights(document.rawText);
      document.summary = insights.summary;
      document.keyPoints = insights.keyPoints;
      await document.save();
    }

    res.json({
      success: true,
      data: {
        summary: document.summary,
        keyPoints: document.keyPoints,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
