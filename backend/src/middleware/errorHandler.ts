import axios from 'axios';
import { NextFunction, Request, Response } from 'express';

interface ApiError extends Error {
  statusCode?: number;
}

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ message: 'Route not found' });
};

export const errorHandler = (
  error: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status || 502;
    const message =
      (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ||
      error.message;
    res.status(statusCode).json({ message });
    return;
  }

  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    message: error.message || 'Internal server error',
  });
};
