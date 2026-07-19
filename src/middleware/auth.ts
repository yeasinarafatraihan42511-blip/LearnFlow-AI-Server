import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/better-auth.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
  };
  session?: any;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Better Auth retrieves session context from the incoming headers / cookies
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No active session found',
      });
    }

    req.user = session.user;
    req.session = session.session;
    next();
  } catch (error) {
    console.error('🔒 Better Auth Middleware Error:', error);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Session validation failed',
    });
  }
};
