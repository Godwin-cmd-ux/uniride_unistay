import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(
        400,
        'Please check the submitted fields',
        'VALIDATION_ERROR',
        error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }
    throw error;
  }
}

export function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json({ data });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: { message: error.message, code: error.code, details: error.details },
    });
    return;
  }
  console.error('[api] unhandled error', error);
  res.status(500).json({
    error: { message: 'Something went wrong on our side', code: 'INTERNAL_ERROR' },
  });
}
