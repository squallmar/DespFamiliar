import { NextResponse } from 'next/server';
import { clearAuthCookieOptions } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ message: 'Logout realizado com sucesso' });
  
  // Remover cookie
  response.cookies.set('token', '', clearAuthCookieOptions());

  return response;
}