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
  const isDuplicateKeyError =
    typeof (err as unknown as { code?: unknown }).code === "number" &&
    (err as unknown as { code?: number }).code === 11000;

  const statusCode = isDuplicateKeyError
    ? 409
    : (Number.isInteger(err.statusCode) ? (err.statusCode as number) : 500);
  const isOperational = statusCode < 500;

  const payload: Record<string, unknown> = {
    success: false,
    message: isDuplicateKeyError
      ? "A record with the same unique value already exists."
      : (isOperational ? err.message : "Internal server error"),
  };

  if (process.env.NODE_ENV !== "production" && err.details !== undefined) {
    payload.details = err.details;
  }

  if (process.env.NODE_ENV !== "production") {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}
