import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

import { authRouter } from "./routes/auth";
import { questionsRouter } from "./routes/questions";
import { examRouter } from "./routes/exam";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "MathApp API",
        version: "1.0.0",
        description: "Kimlik doğrulama + AI destekli matematik soru çözme API'si",
      },
      servers: [{ url: "/" }],
    },
    apis: [],
  });
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/auth", authRouter);
  app.use("/questions", questionsRouter);
  app.use("/exam", examRouter);

  app.use((req, res) => {
    res.status(404).json({
      type: "about:blank",
      title: "Bulunamadı",
      status: 404,
      detail: `${req.method} ${req.path} bulunamadı.`,
    });
  });

  return app;
}
