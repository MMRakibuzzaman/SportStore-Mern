import type { NextFunction, Request, Response } from "express";
import type { HttpError } from "../types/http-error.js";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  const error = new Error("Resource not found") as HttpError;
  error.statusCode = 404;
  next(error);
}

export function globalErrorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = Number.isInteger(err.statusCode) ? (err.statusCode as number) : 500;
  const isOperational = statusCode < 500;

  const payload: Record<string, unknown> = {
    success: false,
    message: isOperational ? err.message : "Internal server error",
  };

  if (process.env.NODE_ENV !== "production" && err.details !== undefined) {
    payload.details = err.details;
  }

  if (process.env.NODE_ENV !== "production") {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}
