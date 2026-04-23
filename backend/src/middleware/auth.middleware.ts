import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getAuthCookieName, getJwtSecret } from "../config/jwt.js";
import type { AuthTokenPayload } from "../types/auth.js";
import type { HttpError } from "../types/http-error.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[getAuthCookieName()];

  if (typeof token !== "string" || token.length === 0) {
    next(buildUnauthorizedError("Authentication required"));
    return;
  }

  try {
    const decodedToken = jwt.verify(token, getJwtSecret());

    if (!isAuthTokenPayload(decodedToken)) {
      next(buildUnauthorizedError("Invalid authentication token"));
      return;
    }

    req.authUser = decodedToken;
    next();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError")
    ) {
      next(buildUnauthorizedError("Authentication token is invalid or expired"));
      return;
    }

    next(buildUnauthorizedError("Authentication required"));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.authUser) {
    next(buildUnauthorizedError("Authentication required"));
    return;
  }

  if (req.authUser.role !== "admin") {
    next(buildForbiddenError("Admin access required"));
    return;
  }

  next();
}

function isAuthTokenPayload(payload: string | jwt.JwtPayload): payload is AuthTokenPayload {
  if (typeof payload === "string") {
    return false;
  }

  return (
    typeof payload.userId === "string" &&
    typeof payload.email === "string" &&
    (payload.role === "customer" || payload.role === "admin")
  );
}

function buildUnauthorizedError(message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = 401;
  return error;
}

function buildForbiddenError(message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = 403;
  return error;
}