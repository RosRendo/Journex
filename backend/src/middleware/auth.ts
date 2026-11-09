import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const DEFAULT_ADMINS = ["rousrendo@gmail.com", "admin@journex.io"];
const ENV_ADMINS = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
  .split(",")
  .map((e) => e.toLowerCase().trim())
  .filter(Boolean);

export const ADMIN_EMAILS = Array.from(new Set([...DEFAULT_ADMINS, ...ENV_ADMINS]));
const API_SECRET_KEY = process.env.API_SECRET_KEY || "dev-api-secret-key-change-in-prod";

export interface AuthenticatedRequest extends Request {
  userEmail?: string;
  isAdmin?: boolean;
  isPro?: boolean;
}

/**
 * Validates the Authorization header.
 * In production, this requires a cryptographically signed JWT.
 * In development, it falls back to accepting the raw email for easier local debugging.
 */
export function verifyAdminToken(authHeader: string): { valid: boolean; email?: string; isPro?: boolean } {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false };
  }
  const token = authHeader.slice(7).trim();

  // 1. Try cryptographically verifying the signed JWT
  try {
    const decoded = jwt.verify(token, API_SECRET_KEY) as { email: string; isPro?: boolean };
    if (decoded && decoded.email) {
      const email = decoded.email.toLowerCase();
      return {
        valid: ADMIN_EMAILS.includes(email),
        email,
        isPro: decoded.isPro === true
      };
    }
  } catch (err) {
    // If not a signed JWT, check dev-only raw email fallback
  }

  // 2. In non-production, accept raw token ONLY if it explicitly matches an admin email
  if (process.env.NODE_ENV !== "production") {
    const lowerToken = token.toLowerCase();
    if (ADMIN_EMAILS.includes(lowerToken)) {
      return { valid: true, email: lowerToken, isPro: true };
    }
  }

  return { valid: false };
}

/**
 * Middleware that strictly blocks non-admin requests in production.
 */
export const adminGuard = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || "";
  const { valid, email, isPro } = verifyAdminToken(authHeader);

  if (!valid) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Admin authorization token is invalid or expired."
    });
  }

  req.userEmail = email;
  req.isAdmin = true;
  req.isPro = isPro;
  next();
};
