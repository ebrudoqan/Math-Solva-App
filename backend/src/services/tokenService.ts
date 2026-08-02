import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { store } from "../db/db";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TTL_MIN = parseInt(process.env.ACCESS_TOKEN_TTL_MIN || "15", 10);
const REFRESH_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || "30", 10);

export function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId }, ACCESS_SECRET, {
    expiresIn: `${ACCESS_TTL_MIN}m`,
  });
}

export function verifyAccessToken(token: string): { sub: string } {
  return jwt.verify(token, ACCESS_SECRET) as { sub: string };
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function issueRefreshToken(userId: string): string {
  const raw = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  store.createRefreshToken({
    id: uuidv4(),
    user_id: userId,
    token_hash: hashToken(raw),
    expires_at: expiresAt,
  });

  return raw;
}

export function rotateRefreshToken(rawToken: string): { userId: string; newToken: string } | null {
  const tokenHash = hashToken(rawToken);
  const row = store.findValidRefreshToken(tokenHash);
  if (!row) return null;

  store.revokeRefreshTokenById(row.id);

  const newToken = issueRefreshToken(row.user_id);
  return { userId: row.user_id, newToken };
}

export function revokeRefreshToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  store.revokeRefreshTokenByHash(tokenHash);
}
