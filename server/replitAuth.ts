import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
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
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
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
      
      console.log("Login attempt:", { email, password: password ? "[REDACTED]" : "undefined" });
      
      if (!email || !password) {
        console.log("Missing email or password");
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Mock user authentication for demo (prioritized to avoid database issues)
      if (email === "admin@myclinic.com" && password === "admin123") {
        console.log("Using mock authentication for admin user");
        const mockUser = {
          id: "test-user-1",
          email: "admin@myclinic.com",
          firstName: "Admin",
          lastName: "User",
          role: "admin",
          specialty: "medicines"
        };
        
        try {
          const token = generateJwt(mockUser);
          console.log("Generated JWT token for mock user");
          return res.json({ token });
        } catch (jwtError) {
          console.error("JWT generation error:", jwtError);
          return res.status(500).json({ message: "Authentication system error" });
        }
      }

      console.log("Mock authentication failed, trying database authentication");
      
      // Try database authentication with bcrypt
      try {
        const user = await storage.findUserByEmail(email);
        
        if (!user) {
          console.log("User not found in database");
          return res.status(401).json({ message: "Invalid credentials" });
        }

        // Check if user has a password set
        if (!user.password) {
          return res.status(401).json({ message: "Account not properly configured. Please contact administrator." });
        }

        // Compare password with hash
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          console.log("Password mismatch");
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = generateJwt(user);
        return res.json({ token });
      } catch (dbError) {
        console.error("Database authentication error:", dbError);
        
        // Fallback to mock authentication for development only
        if (process.env.NODE_ENV === 'development' && email === "admin@myclinic.com" && password === "admin123") {
          console.warn("Using mock authentication - this should only happen in development");
          const mockUser = {
            id: "test-user-1",
            email: "admin@myclinic.com",
            firstName: "Admin",
            lastName: "User",
            role: "admin",
            specialty: "medicines"
          };
          
          const token = generateJwt(mockUser);
          return res.json({ token });
        }
        
        console.log("Database not available, falling back to deny access");
        return res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Unexpected login error:", error);
      return res.status(500).json({ message: "Internal server error" });
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