import { NextRequest, NextResponse } from 'next/server';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const WEBHOOK_PATHS = new Set(['/api/premium/webhook', '/api/premium/asaas-webhook']);

function hasValidSameOrigin(request: NextRequest): boolean {
  const host = request.headers.get('host');
  if (!host) {
    return false;
  }

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (!UNSAFE_METHODS.has(request.method)) {
    return NextResponse.next();
  }

  if (WEBHOOK_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(request.cookies.get('token')?.value);
  if (!hasSessionCookie) {
    return NextResponse.next();
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: 'Requisição bloqueada por proteção CSRF' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
