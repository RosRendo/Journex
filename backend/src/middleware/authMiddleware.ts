import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];

    if (process.env.NODE_ENV !== "production") {
      // In development, if the token is a simple email string and not a JWT, allow it
      if (!token.includes(".")) {
        req.userId = token;
        return next();
      }
    }

    const secret = process.env.API_SECRET_KEY || "dev-api-secret-key-change-in-prod";

    if (!secret) {
      console.error("Missing API_SECRET_KEY in environment variables");
      return res.status(500).json({ success: false, message: "Server misconfiguration" });
    }

    // Verify the token
    const decoded = jwt.verify(token, secret) as any;
    
    // Attach user ID/email to the request
    req.userId = decoded.email; // NextAuth signs with { email: token.email }

    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
