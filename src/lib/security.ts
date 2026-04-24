import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `sbk_${randomToken(24)}`;
  const prefix = raw.slice(0, 12);
  return { raw, prefix, hash: sha256(raw) };
}
