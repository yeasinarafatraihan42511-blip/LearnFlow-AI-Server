import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './config/better-auth.js';

// Import Routes
import documentRoutes from './routes/documents.js';
import flashcardRoutes from './routes/flashcards.js';
import quizRoutes from './routes/quizzes.js';
import chatRoutes from './routes/chats.js';
import dashboardRoutes from './routes/dashboard.js';

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Global Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Enable loading of uploaded assets if served statically
}));
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Better Auth API Route Handler
app.all('/api/auth/*', toNodeHandler(auth));

// REST API Routes
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/flashcards', flashcardRoutes);
app.use('/api/v1/quizzes', quizRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`🚀 LearnFlow AI Backend running on http://localhost:${PORT} in ${env.NODE_ENV} mode`);
});

export default app;
