import jwt from "jsonwebtoken";
import type { Express, RequestHandler, Request, Response } from "express";
import { storage } from "./storage";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Extend Express Request to include user property
 */
export interface AuthenticatedRequest extends Request {
  user?: any;
}

const JWT_SECRET = process.env.JWT_SECRET || "myclinic-dev-secret-key-change-in-production";
const ISSUER = process.env.JWT_ISSUER || "https://myclinic.local";

// Validate JWT configuration
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('Warning: JWT_SECRET not set in production environment!');
}

/**
 * Generate a signed JWT for a user
 */
function generateJwt(user: any) {
  const payload = {
    id: user.id,
    email: user.email,
    claims: { sub: user.id, email: user.email },
  };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1h",
    issuer: ISSUER,
  });
}

/**
 * Verify and decode a JWT
 */
function verifyJwt(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET, { issuer: ISSUER });
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Sync user claims into storage (optional)
 */
async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims.id,
    email: claims.email,
    firstName: claims.firstName,
    lastName: claims.lastName,
    profileImageUrl: claims.profileImageUrl,
  });
}

/**
 * Setup routes for JWT auth
 */
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  // JWT login route
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Replace with your user lookup and password check logic
      const user = await storage.findUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Note: In production, you should hash passwords and compare hashes
      // For development, we'll add a simple password field check
      // This is a temporary solution - implement proper password hashing in production
      if (password !== "admin123") { // Simple check for demo
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateJwt(user);
      res.json({ token });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // JWT logout route (client just deletes token)
  app.post("/api/logout", (_req: Request, res: Response) => {
    res.json({ message: "Logged out" });
  });
}

/**
 * Middleware: Protect routes
 */
export const isAuthenticated: RequestHandler = (req: AuthenticatedRequest, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyJwt(token);
    req.user = decoded; // attach decoded JWT payload to request
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};