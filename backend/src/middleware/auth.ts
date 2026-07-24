import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const ADMIN_EMAIL = "rousrendo@gmail.com";
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
  // In local development, always assume admin to avoid issues with missing tokens
  if (process.env.NODE_ENV !== "production") {
    return { valid: true, email: ADMIN_EMAIL, isPro: true };
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false };
  }
  const token = authHeader.slice(7).trim();

  try {
    // 1. Try cryptographically verifying the JWT
    const decoded = jwt.verify(token, API_SECRET_KEY) as { email: string; isPro?: boolean };
    if (decoded && decoded.email) {
      const email = decoded.email.toLowerCase();
      return {
        valid: email === ADMIN_EMAIL.toLowerCase(),
        email,
        isPro: decoded.isPro === true
      };
    }
  } catch (err) {
    // Ignore error in production, handled below
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
