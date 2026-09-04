/**
 * ✅ Centralized Error Handling & Custom Error Types
 * Provides structured error handling with context
 */

import { logger } from '@/lib/logger';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, context);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 404, context);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Não autorizado', context?: Record<string, any>) {
    super(message, 401, context);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso proibido', context?: Record<string, any>) {
    super(message, 403, context);
    this.name = 'ForbiddenError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    statusCode: number = 500,
    context?: Record<string, any>
  ) {
    super(`${service}: ${message}`, statusCode, { service, ...context });
    this.name = 'ExternalServiceError';
  }
}

/**
 * ✅ Safe async wrapper for API calls
 * Logs errors, converts to AppError, re-throws with context
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  context: { operation: string; userId?: string; [key: string]: any }
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`Operation failed: ${context.operation}`, error, context);

    // Re-throw if already AppError
    if (err instanceof AppError) throw err;

    // Convert network errors
    if (error.message.includes('fetch')) {
      throw new ExternalServiceError(
        'Network',
        'Erro de conexão. Verifique sua internet.',
        500,
        context
      );
    }

    // Generic error
    throw new AppError(error.message, 500, context);
  }
}

/**
 * ✅ Retry logic for transient failures
 * Exponential backoff: 1s, 2s, 4s
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, backoffFactor = 2 } = options;

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on validation/auth errors
      if (
        lastError.message.includes('401') ||
        lastError.message.includes('403') ||
        lastError.message.includes('ValidationError')
      ) {
        throw err;
      }

      // Wait before retry
      if (attempt < maxAttempts) {
        const delay = delayMs * Math.pow(backoffFactor, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * ✅ User-friendly error message
 * Converts technical errors to readable messages
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message;
  }
  if (error instanceof NotFoundError) {
    return 'Recurso não encontrado';
  }
  if (error instanceof UnauthorizedError) {
    return 'Faça login novamente';
  }
  if (error instanceof ForbiddenError) {
    return 'Você não tem permissão para fazer isso';
  }
  if (error instanceof ExternalServiceError) {
    return `Falha ao conectar com ${error.context?.service || 'serviço externo'}. Tente novamente.`;
  }
  if (error instanceof Error) {
    return error.message.includes('fetch')
      ? 'Erro de conexão. Verifique sua internet.'
      : error.message;
  }
  return 'Algo deu errado. Tente novamente.';
}
