import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Express, RequestHandler, Request, Response } from "express";
import { storage } from "./storage";
import dotenv from "dotenv";
import crypto from "crypto";

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
 * Generate a signed JWT for a user with session information
 */
function generateJwt(user: any, sessionId?: string) {
  const payload = {
    id: user.id,
    email: user.email,
    sessionId: sessionId,
    claims: { sub: user.id, email: user.email, sessionId: sessionId },
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
 * Generate a unique session token
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get device information from request headers
 */
function getDeviceInfo(req: Request): string {
  const userAgent = req.get('User-Agent') || 'Unknown';
  const platform = req.get('Sec-CH-UA-Platform') || 'Unknown';
  return `${userAgent} (${platform})`;
}

/**
 * Get client IP address
 */
function getClientIp(req: Request): string {
  return req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string || 'Unknown';
}

/**
 * Check for concurrent sessions and handle them
 */
async function handleConcurrentSessions(userId: string): Promise<{ hasActiveSessions: boolean, activeSessions: any[] }> {
  // Clean up expired sessions first
  await storage.cleanupExpiredSessions();
  
  const activeSessions = await storage.getUserActiveSessions(userId);
  return {
    hasActiveSessions: activeSessions.length > 0,
    activeSessions
  };
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
          role: "super_admin",
          specialty: "medicines"
        };
        
        try {
          // Ensure mock user exists in database
          await storage.upsertUser(mockUser);
          
          // Check for concurrent sessions
          const { hasActiveSessions, activeSessions } = await handleConcurrentSessions(mockUser.id);
          
          if (hasActiveSessions) {
            console.log(`Blocking login: Found ${activeSessions.length} active session(s) for user ${mockUser.id}`);
            return res.status(409).json({
              message: "User already logged in from another device",
              code: "CONCURRENT_SESSION_DETECTED",
              activeSessions: activeSessions.map(s => ({
                id: s.id,
                deviceInfo: s.deviceInfo,
                ipAddress: s.ipAddress,
                lastActivity: s.lastActivity
              }))
            });
          }
          
          // Create new session
          const sessionToken = generateSessionToken();
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for testing
          
          const session = await storage.createUserSession({
            userId: mockUser.id,
            sessionToken,
            deviceInfo: getDeviceInfo(req),
            ipAddress: getClientIp(req),
            expiresAt
          });
          
          await storage.updateLastLogin(mockUser.id);
          
          const token = generateJwt(mockUser, session.id);
          console.log("Generated JWT token for mock user with session");
          return res.json({ 
            token, 
            sessionId: session.id
          });
        } catch (error) {
          console.error("Mock authentication error:", error);
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

        // Check for concurrent sessions
        const { hasActiveSessions, activeSessions } = await handleConcurrentSessions(user.id);
        
        if (hasActiveSessions) {
          console.log(`Blocking login: Found ${activeSessions.length} active session(s) for user ${user.id}`);
          return res.status(409).json({
            message: "User already logged in from another device",
            code: "CONCURRENT_SESSION_DETECTED",
            activeSessions: activeSessions.map(s => ({
              id: s.id,
              deviceInfo: s.deviceInfo,
              ipAddress: s.ipAddress,
              lastActivity: s.lastActivity
            }))
          });
        }

        // Create new session
        const sessionToken = generateSessionToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for testing
        
        console.log("Creating session for user:", user.id, "with token:", sessionToken.substring(0, 10) + "...");
        const session = await storage.createUserSession({
          userId: user.id,
          sessionToken,
          deviceInfo: getDeviceInfo(req),
          ipAddress: getClientIp(req),
          expiresAt
        });
        console.log("Session created successfully:", session.id);

        await storage.updateLastLogin(user.id);
        console.log("Updated last login for user:", user.id);

        const token = generateJwt(user, session.id);
        return res.json({ 
          token, 
          sessionId: session.id
        });
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
            role: "super_admin",
            specialty: "medicines"
          };
          
          try {
            await storage.upsertUser(mockUser);
            
            // Check for concurrent sessions
            const { hasActiveSessions, activeSessions } = await handleConcurrentSessions(mockUser.id);
            
            if (hasActiveSessions) {
              console.log(`Blocking fallback login: Found ${activeSessions.length} active session(s) for user ${mockUser.id}`);
              return res.status(409).json({
                message: "User already logged in from another device",
                code: "CONCURRENT_SESSION_DETECTED",
                activeSessions: activeSessions.map(s => ({
                  id: s.id,
                  deviceInfo: s.deviceInfo,
                  ipAddress: s.ipAddress,
                  lastActivity: s.lastActivity
                }))
              });
            }
            
            // Create new session
            const sessionToken = generateSessionToken();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for testing
            
            const session = await storage.createUserSession({
              userId: mockUser.id,
              sessionToken,
              deviceInfo: getDeviceInfo(req),
              ipAddress: getClientIp(req),
              expiresAt
            });
            
            await storage.updateLastLogin(mockUser.id);
            
            const token = generateJwt(mockUser, session.id);
            return res.json({ 
              token, 
              sessionId: session.id
            });
          } catch (error) {
            console.warn("Failed to setup fallback mock user session:", error);
            const token = generateJwt(mockUser);
            return res.json({ token });
          }
        }
        
        console.log("Database not available, falling back to deny access");
        return res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Unexpected login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // JWT logout route - invalidate session
  app.post("/api/logout", async (req: Request, res: Response) => {
    try {
      console.log("[Logout] Processing logout request");
      const authHeader = req.headers.authorization;
      console.log("[Logout] Auth header present:", !!authHeader);
      
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        console.log("[Logout] Token extracted, length:", token.length);
        
        const decoded = verifyJwt(token) as any;
        console.log("[Logout] JWT decoded:", { id: decoded?.id, sub: decoded?.sub });
        
        // Try both 'id' and 'sub' fields from JWT
        const userId = decoded.id || decoded.sub;
        if (userId) {
          console.log("Logging out user:", userId);
          // Invalidate all sessions for this user
          await storage.invalidateAllUserSessions(userId);
          console.log("All sessions invalidated for user:", userId);
        } else {
          console.log("[Logout] No valid user ID found in JWT token");
        }
      } else {
        console.log("[Logout] No valid authorization header");
      }
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("[Logout] Logout error:", error);
      res.json({ message: "Logged out" }); // Still return success even if session cleanup fails
    }
  });
}

/**
 * Middleware: Protect routes
 */
export const isAuthenticated: RequestHandler = async (req: AuthenticatedRequest, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyJwt(token) as any;
    req.user = decoded; // attach decoded JWT payload to request
    
    // For existing users without sessions, create one automatically
    if (decoded.id && !decoded.sessionId) {
      try {
        const existingSessions = await storage.getUserActiveSessions(decoded.id);
        if (existingSessions.length === 0) {
          console.log("Creating session for existing authenticated user:", decoded.id);
          const sessionToken = generateSessionToken();
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for testing
          
          await storage.createUserSession({
            userId: decoded.id,
            sessionToken,
            deviceInfo: getDeviceInfo(req),
            ipAddress: getClientIp(req),
            expiresAt
          });
          console.log("Session created for existing user:", decoded.id);
        }
      } catch (sessionError) {
        console.error("Error creating session for existing user:", sessionError);
        // Continue anyway - don't block authentication
      }
    }
    
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};