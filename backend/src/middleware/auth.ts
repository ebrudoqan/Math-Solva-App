import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/tokenService";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      type: "about:blank",
      title: "Yetkisiz",
      status: 401,
      detail: "Erişim token'ı eksik veya hatalı formatta.",
    });
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({
      type: "about:blank",
      title: "Yetkisiz",
      status: 401,
      detail: "Erişim token'ı geçersiz veya süresi dolmuş. /auth/refresh ile yenileyin.",
    });
  }
}
