import rateLimit from "express-rate-limit";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  limit: 10, // pencere başına en fazla 10 deneme
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    type: "about:blank",
    title: "Çok Fazla Deneme",
    status: 429,
    detail: "Çok fazla giriş denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyin.",
  },
});
