import request from "supertest";
import fs from "fs";
import path from "path";

// Her test çalıştırmasında temiz bir veritabanı kullan
const TEST_DB_PATH = path.join(__dirname, "test-data.json");
process.env.DB_PATH = TEST_DB_PATH;
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.ACCESS_TOKEN_TTL_MIN = "15";
process.env.REFRESH_TOKEN_TTL_DAYS = "30";

import { createApp } from "../src/app";

const app = createApp();

beforeAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

afterAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

describe("Kimlik doğrulama akışı", () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: "supersecret123",
    name: "Test Kullanıcı",
  };

  let accessToken: string;
  let refreshToken: string;

  test("POST /auth/register - yeni kullanıcı oluşturur ve token döner", async () => {
    const res = await request(app).post("/auth/register").send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
  });

  test("POST /auth/register - aynı e-posta ile ikinci kayıt reddedilir", async () => {
    const res = await request(app).post("/auth/register").send(testUser);
    expect(res.status).toBe(409);
  });

  test("POST /auth/login - yanlış şifre ile giriş reddedilir", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: testUser.email, password: "yanlisSifre" });
    expect(res.status).toBe(401);
  });

  test("POST /auth/login - doğru bilgilerle giriş başarılı olur", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: testUser.email, password: testUser.password });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  test("GET /auth/me - token olmadan erişim reddedilir (401)", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  test("GET /auth/me - geçerli token ile kullanıcı bilgisi döner", async () => {
    const res = await request(app).get("/auth/me").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testUser.email);
  });

  test("POST /auth/refresh - yenileme token'ı ile yeni erişim token'ı üretir", async () => {
    const res = await request(app).post("/auth/refresh").send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    // Rotation: yeni refresh token eskisinden farklı olmalı
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  test("POST /auth/refresh - kullanılmış (eski) token bir daha kabul edilmez", async () => {
    const res = await request(app).post("/auth/refresh").send({ refreshToken });
    expect(res.status).toBe(401);
  });

  test("POST /auth/logout - yenileme token'ını geçersiz kılar", async () => {
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: testUser.email, password: testUser.password });
    const rt = loginRes.body.refreshToken;

    const logoutRes = await request(app).post("/auth/logout").send({ refreshToken: rt });
    expect(logoutRes.status).toBe(204);

    const refreshAfterLogout = await request(app).post("/auth/refresh").send({ refreshToken: rt });
    expect(refreshAfterLogout.status).toBe(401);
  });
});
