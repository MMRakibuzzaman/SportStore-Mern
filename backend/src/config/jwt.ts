import type { CookieOptions } from "express";
import type { SignOptions } from "jsonwebtoken";

type JwtExpiresIn = NonNullable<SignOptions["expiresIn"]>;

export function getJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }

  return jwtSecret;
}

export function getJwtExpiresIn(): JwtExpiresIn {
  return (process.env.JWT_EXPIRES_IN ?? "7d") as JwtExpiresIn;
}

export function getAuthCookieName(): string {
  return process.env.AUTH_COOKIE_NAME ?? "auth_token";
}

export function getAuthCookieOptions(): CookieOptions {
  const parsedMaxAge = Number.parseInt(process.env.AUTH_COOKIE_MAX_AGE_MS ?? "604800000", 10);
  const maxAge = Number.isFinite(parsedMaxAge) && parsedMaxAge > 0 ? parsedMaxAge : 604800000;

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}