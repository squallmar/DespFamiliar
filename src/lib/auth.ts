import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    return 'dev-secret-local';
  }
  return secret;
}

interface JWTPayload {
  userId: string;
  name: string;
  email: string;
}

export function getAuthUser(request: NextRequest): JWTPayload | null {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, getJwtSecret()) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Erro na verificação do token:', error);
    return null;
  }
}

export function requireAuth(request: NextRequest): JWTPayload {
  const user = getAuthUser(request);
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}