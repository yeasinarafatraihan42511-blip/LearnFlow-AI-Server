import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { askMentor } from '../services/ai.js';
import { ChatSessionModel } from '../models/ChatSession.js';
import { DocumentModel } from '../models/Document.js';

const router = Router();

router.use(requireAuth);

// @route   GET /api/v1/chats/document/:id
// @desc    Get or initialize a chat session for a document
router.get('/document/:id', async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.user?.id as string;
    const documentId = req.params.id as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let chat = await ChatSessionModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      documentId: new mongoose.Types.ObjectId(documentId),
    });

    if (!chat) {
      const doc = await DocumentModel.findOne({
        _id: new mongoose.Types.ObjectId(documentId),
        userId: new mongoose.Types.ObjectId(userId),
      });

      if (!doc) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }

      chat = new ChatSessionModel({
        userId: new mongoose.Types.ObjectId(userId),
        documentId: new mongoose.Types.ObjectId(documentId),
        title: `${doc.title} Chat Session`,
        messages: [
          {
            role: 'assistant',
            content: `Hello! I'm your LearnFlow Mentor. I've read "${doc.title}". What would you like to explore or clarify today?`,
            timestamp: new Date(),
          },
        ],
      });

      await chat.save();
    }

    res.json({ success: true, data: chat });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/v1/chats/document/:id
// @desc    Send a message to the AI Mentor
router.post('/document/:id', async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.user?.id as string;
    const documentId = req.params.id as string;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty' });
    }

    // 1. Fetch document text
    const doc = await DocumentModel.findOne({
      _id: new mongoose.Types.ObjectId(documentId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // 2. Fetch or create chat session
    let chat = await ChatSessionModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      documentId: new mongoose.Types.ObjectId(documentId),
    });

    if (!chat) {
      chat = new ChatSessionModel({
        userId: new mongoose.Types.ObjectId(userId),
        documentId: new mongoose.Types.ObjectId(documentId),
        title: `${doc.title} Chat Session`,
        messages: [],
      });
    }

    // 3. Keep memory constraints (last 10 messages for context)
    const contextHistory = chat.messages
      .slice(-10)
      .map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content as string,
      }));

    // 4. Query mentor response
    const mentorResponse = await askMentor(doc.rawText, message, contextHistory);

    // 5. Save both user message and assistant message to history
    chat.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    chat.messages.push({
      role: 'assistant',
      content: mentorResponse,
      timestamp: new Date(),
    });

    await chat.save();

    res.json({
      success: true,
      data: {
        reply: mentorResponse,
        session: chat,
      },
    });
  } catch (error: any) {
    console.error('❌ Chat request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
