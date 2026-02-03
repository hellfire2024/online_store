import { Request, Response, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email?: string;
  type: 'admin' | 'customer';
  role?: string;
  permissions?: string[];
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
}

export function getAuthUser(req: Request): AuthUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const secret: Secret = process.env.JWT_SECRET || 'dev-secret';

  try {
    const decoded = jwt.verify(token, secret) as any;
    if (!decoded?.id || !decoded?.type) {
      return null;
    }

    return {
      id: decoded.id,
      email: decoded.email,
      type: decoded.type,
      role: decoded.role,
      permissions: decoded.permissions,
    };
  } catch (_error) {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  (req as AuthenticatedRequest).authUser = user;
  return next();
}

export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (user.type !== 'customer') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  (req as AuthenticatedRequest).authUser = user;
  return next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (user.type !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  (req as AuthenticatedRequest).authUser = user;
  return next();
}
