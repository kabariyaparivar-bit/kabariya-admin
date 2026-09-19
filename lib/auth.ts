import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getDb } from "./mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "kabariya_parivar_jwt_secret_2026_60d_auth_token_key";

export interface AdminUser {
  id?: string;
  username: string;
  password?: string;
  name: string;
  role: "superadmin" | "admin" | "editor";
  createdAt?: Date;
}

export interface TokenPayload {
  username: string;
  role: string;
  name: string;
}

/**
 * Signs a JWT token with 60 days expiration time
 */
export function createToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "60d",
  });
}

/**
 * Verifies JWT token and extracts payload
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare plain password with bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validates request authorization using JWT Bearer or API Key
 */
export function isAuthorizedAdmin(request: Request): boolean {
  const configuredKey = process.env.ADMIN_API_KEY || "kabariya_admin_secret_key_2026";

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const decoded = verifyToken(token);
    if (decoded) return true;
    if (token === configuredKey.trim()) return true;
  }

  const headerKey = request.headers.get("x-admin-key");
  if (headerKey && headerKey.trim() === configuredKey.trim()) {
    return true;
  }

  return false;
}

/**
 * Automatically seeds the default admin in MongoDB admins collection if empty
 */
export async function ensureDefaultAdmin(): Promise<AdminUser> {
  const defaultUsername = process.env.ADMIN_DEFAULT_USERNAME || "admin";
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || "kabariya@admin2026";

  const db = await getDb();
  if (!db) {
    return {
      username: defaultUsername,
      name: "Kabariya Parivar Admin",
      role: "superadmin",
    };
  }

  const adminsCol = db.collection<AdminUser>("admins");
  const existing = await adminsCol.findOne({ username: defaultUsername });

  if (existing) {
    return existing;
  }

  const hashedPassword = await hashPassword(defaultPassword);
  const newAdmin: AdminUser = {
    username: defaultUsername,
    password: hashedPassword,
    name: "Kabariya Parivar Admin",
    role: "superadmin",
    createdAt: new Date(),
  };

  await adminsCol.insertOne(newAdmin as any);
  return newAdmin;
}
