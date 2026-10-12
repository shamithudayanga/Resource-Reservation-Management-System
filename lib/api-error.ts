import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BAD_REQUEST'
  | 'INTERNAL_SERVER_ERROR';

export function createErrorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status }
  );
}

export function handleApiError(error: unknown) {
  console.error('[API Error]:', error);

  if (error instanceof ZodError) {
    const formattedErrors = error.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return createErrorResponse(
      400,
      'VALIDATION_ERROR',
      error.issues[0]?.message || 'Validation failed',
      formattedErrors
    );
  }

  // Check for Postgres Exclusion violation (23P01) or Unique violation (23505)
  const err = error as Record<string, unknown> | null;
  if (err && (err.code === '23P01' || (typeof err.message === 'string' && err.message.includes('23P01')))) {
    return createErrorResponse(
      409,
      'CONFLICT',
      'This resource is already reserved for the selected time range. Please choose a different slot.'
    );
  }

  if (err && (err.code === 'P2002' || err.code === '23505')) {
    return createErrorResponse(
      409,
      'CONFLICT',
      'A record with this identifier or unique field already exists.'
    );
  }

  if (err && err.code === 'P2025') {
    return createErrorResponse(
      404,
      'NOT_FOUND',
      'The requested record was not found.'
    );
  }

  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  return createErrorResponse(500, 'INTERNAL_SERVER_ERROR', message);
}
