import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { store } from "../db/db";
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from "../services/tokenService";
import { loginRateLimiter } from "../middleware/rateLimit";
import { requireAuth, AuthedRequest } from "../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı."),
  name: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function problemDetails(status: number, title: string, detail: string) {
  return { type: "about:blank", title, status, detail };
}

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json(problemDetails(400, "Doğrulama Hatası", parsed.error.issues[0].message));
  }
  const { email, password, name } = parsed.data;

  const existing = store.findUserByEmail(email);
  if (existing) {
    return res
      .status(409)
      .json(problemDetails(409, "Kullanıcı Zaten Var", "Bu e-posta ile kayıtlı bir kullanıcı zaten var."));
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = uuidv4();
  store.createUser({ id: userId, email, password_hash: passwordHash, name: name || null });

  const accessToken = signAccessToken(userId);
  const refreshToken = issueRefreshToken(userId);

  res.status(201).json({
    user: { id: userId, email, name: name || null },
    accessToken,
    refreshToken,
  });
});

authRouter.post("/login", loginRateLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(problemDetails(400, "Doğrulama Hatası", "E-posta ve şifre gerekli."));
  }
  const { email, password } = parsed.data;

  const user = store.findUserByEmail(email);
  if (!user) {
    return res.status(401).json(problemDetails(401, "Giriş Başarısız", "E-posta veya şifre hatalı."));
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json(problemDetails(401, "Giriş Başarısız", "E-posta veya şifre hatalı."));
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = issueRefreshToken(user.id);

  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
  });
});

authRouter.post("/refresh", (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json(problemDetails(400, "Doğrulama Hatası", "refreshToken gerekli."));
  }

  const result = rotateRefreshToken(refreshToken);
  if (!result) {
    return res
      .status(401)
      .json(problemDetails(401, "Geçersiz Token", "Yenileme token'ı geçersiz veya süresi dolmuş."));
  }

  const accessToken = signAccessToken(result.userId);
  res.json({ accessToken, refreshToken: result.newToken });
});

authRouter.post("/logout", (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) revokeRefreshToken(refreshToken);
  res.status(204).send();
});

authRouter.get("/me", requireAuth, (req: AuthedRequest, res) => {
  const user = store.findUserById(req.userId!);
  if (!user) return res.status(404).json(problemDetails(404, "Bulunamadı", "Kullanıcı bulunamadı."));
  res.json({ id: user.id, email: user.email, name: user.name, created_at: user.created_at });
});

const forgotPasswordSchema = z.object({ email: z.string().email() });

/**
 * POST /auth/forgot-password
 *
 * NOT: Bu projede e-posta gönderme servisi kurulu değil (ayrı bir hesap/API
 * anahtarı gerektirir). Bu yüzden sıfırlama kodu doğrudan API yanıtında
 * döndürülüyor — bu SADECE demo/öğrenme amaçlı bir basitleştirme, gerçek bir
 * üretim uygulamasında kod asla client'a değil, sadece kullanıcının
 * e-postasına gönderilmelidir.
 */
authRouter.post("/forgot-password", loginRateLimiter, (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(problemDetails(400, "Doğrulama Hatası", "Geçerli bir e-posta girin."));
  }
  const { email } = parsed.data;

  const user = store.findUserByEmail(email);
  // Kullanıcı yoksa bile aynı yanıtı döneriz (e-posta numaralandırma saldırısını önlemek için)
  if (!user) {
    return res.json({ message: "Bu e-posta kayıtlıysa bir sıfırlama kodu oluşturuldu." });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  store.createPasswordReset(email, code, expiresAt);

  res.json({
    message: "Bu e-posta kayıtlıysa bir sıfırlama kodu oluşturuldu.",
    devCode: code, // DEMO AMAÇLI: gerçek üretimde bu satır olmamalı, kod e-postayla gider
  });
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8, "Şifre en az 8 karakter olmalı."),
});

authRouter.post("/reset-password", (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json(problemDetails(400, "Doğrulama Hatası", parsed.error.issues[0].message));
  }
  const { email, code, newPassword } = parsed.data;

  const reset = store.findValidPasswordReset(email, code);
  if (!reset) {
    return res
      .status(400)
      .json(problemDetails(400, "Geçersiz Kod", "Kod geçersiz veya süresi dolmuş."));
  }

  const user = store.findUserByEmail(email);
  if (!user) {
    return res.status(404).json(problemDetails(404, "Bulunamadı", "Kullanıcı bulunamadı."));
  }

  bcrypt.hash(newPassword, 12).then((hash) => {
    store.updateUserPassword(user.id, hash);
    store.consumePasswordReset(email, code);
    res.json({ message: "Şifren başarıyla güncellendi." });
  });
});
