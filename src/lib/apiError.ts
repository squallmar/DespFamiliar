import { NextResponse } from 'next/server';

/**
 * Centralized API error handler that returns 401 for authentication failures
 * and 500 for all other errors.
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  // Check if it's an authentication error
  if (error instanceof Error && error.message === 'Unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Log and return internal server error for all other cases
  console.error(context, error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
