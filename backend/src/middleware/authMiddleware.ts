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
    const secret = process.env.SUPABASE_JWT_SECRET;

    if (!secret) {
      console.error("Missing SUPABASE_JWT_SECRET in environment variables");
      return res.status(500).json({ success: false, message: "Server misconfiguration" });
    }

    // Verify the token
    const decoded = jwt.verify(token, secret) as any;
    
    // Attach user ID to the request
    req.userId = decoded.sub; // Supabase uses 'sub' for the user ID

    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
