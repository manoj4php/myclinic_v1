import jwt from "jsonwebtoken";
import type { Express, RequestHandler, Request } from "express";
import { storage } from "./storage";

debugger
/**
 * Extend Express Request to include user property
 */
export interface AuthenticatedRequest extends Request {
  user?: any;
}

const JWT_SECRET = "myclinic123";
const ISSUER =  "https://example.com";

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
  debugger;
  app.set("trust proxy", 1);

  // JWT login route
  app.post("/api/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    // Replace with your user lookup and password check logic
    const user = await storage.findUserByEmail(email);
    debugger;
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = generateJwt(user);
    res.json({ token });
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
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyJwt(token);
    req.user = decoded; // attach decoded JWT payload to request
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};