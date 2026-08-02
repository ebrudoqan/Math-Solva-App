import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { store } from "../db/db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { solveMathQuestion, solveMathQuestionFromImage, extractQuestionFromImage, generateSimilarQuestion, generateSimilarQuestions } from "../services/mathAiService";

export const questionsRouter = Router();
questionsRouter.use(requireAuth);

const solveSchema = z.object({
  question: z.string().min(3, "Soru metni çok kısa."),
});

const solveImageSchema = z.object({
  imageBase64: z.string().min(100, "Görsel verisi eksik."),
  mediaType: z.enum(["image/jpeg", "image/png"]).default("image/jpeg"),
});

questionsRouter.post("/solve", async (req: AuthedRequest, res) => {
  const parsed = solveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      type: "about:blank",
      title: "Doğrulama Hatası",
      status: 400,
      detail: parsed.error.issues[0].message,
    });
  }

  try {
    const solved = await solveMathQuestion(parsed.data.question);
    const id = uuidv4();

    store.addQuestion({
      id,
      user_id: req.userId!,
      question_text: parsed.data.question,
      topic: solved.topic,
      difficulty: solved.difficulty,
      solution_steps: solved.solution_steps,
      formulas: solved.formulas,
      final_answer: solved.final_answer,
    });

    res.status(201).json({ id, question: parsed.data.question, ...solved });
  } catch (err) {
    console.error(err);
    res.status(502).json({
      type: "about:blank",
      title: "Çözüm Üretilemedi",
      status: 502,
      detail: "Yapay zeka servisinden geçerli bir çözüm alınamadı. Lütfen tekrar deneyin.",
    });
  }
});

questionsRouter.post("/solve-image", async (req: AuthedRequest, res) => {
  const parsed = solveImageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      type: "about:blank",
      title: "Doğrulama Hatası",
      status: 400,
      detail: parsed.error.issues[0].message,
    });
  }

  try {
    const solved = await solveMathQuestionFromImage(parsed.data.imageBase64, parsed.data.mediaType);
    const id = uuidv4();

    store.addQuestion({
      id,
      user_id: req.userId!,
      question_text: solved.extracted_question_text,
      topic: solved.topic,
      difficulty: solved.difficulty,
      solution_steps: solved.solution_steps,
      formulas: solved.formulas,
      final_answer: solved.final_answer,
    });

    res.status(201).json({ id, question: solved.extracted_question_text, ...solved });
  } catch (err) {
    console.error(err);
    res.status(502).json({
      type: "about:blank",
      title: "Çözüm Üretilemedi",
      status: 502,
      detail: "Fotoğraftaki soru okunamadı veya çözülemedi. Daha net bir fotoğrafla tekrar dene.",
    });
  }
});

const extractImageSchema = z.object({
  imageBase64: z.string().min(100, "Görsel verisi eksik."),
  mediaType: z.enum(["image/jpeg", "image/png"]).default("image/jpeg"),
});

questionsRouter.post("/extract-image", async (req: AuthedRequest, res) => {
  const parsed = extractImageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      type: "about:blank",
      title: "Doğrulama Hatası",
      status: 400,
      detail: parsed.error.issues[0].message,
    });
  }

  try {
    const text = await extractQuestionFromImage(parsed.data.imageBase64, parsed.data.mediaType);
    res.json({ extracted_text: text });
  } catch (err) {
    console.error(err);
    res.status(502).json({
      type: "about:blank",
      title: "Metin Okunamadı",
      status: 502,
      detail: "Fotoğraftaki metin okunamadı. Daha net bir fotoğrafla tekrar dene.",
    });
  }
});

const similarSchema = z.object({
  referenceQuestion: z.string().min(3),
  topic: z.string().min(1),
  difficulty: z.string().min(1),
});

questionsRouter.post("/similar", async (req: AuthedRequest, res) => {
  const parsed = similarSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      type: "about:blank",
      title: "Doğrulama Hatası",
      status: 400,
      detail: parsed.error.issues[0].message,
    });
  }

  try {
    const newQuestionText = await generateSimilarQuestion(
      parsed.data.referenceQuestion,
      parsed.data.topic,
      parsed.data.difficulty
    );
    const solved = await solveMathQuestion(newQuestionText);
    const id = uuidv4();

    store.addQuestion({
      id,
      user_id: req.userId!,
      question_text: newQuestionText,
      topic: solved.topic,
      difficulty: solved.difficulty,
      solution_steps: solved.solution_steps,
      formulas: solved.formulas,
      final_answer: solved.final_answer,
    });

    res.status(201).json({ id, question: newQuestionText, ...solved });
  } catch (err) {
    console.error(err);
    res.status(502).json({
      type: "about:blank",
      title: "Benzer Soru Üretilemedi",
      status: 502,
      detail: "Yapay zeka servisinden benzer soru alınamadı. Lütfen tekrar deneyin.",
    });
  }
});

const similarBatchSchema = z.object({
  referenceQuestion: z.string().min(3),
  topic: z.string().min(1),
  difficulty: z.string().min(1),
  count: z.number().int().min(2).max(8).default(4),
});

questionsRouter.post("/similar-batch", async (req: AuthedRequest, res) => {
  const parsed = similarBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      type: "about:blank",
      title: "Doğrulama Hatası",
      status: 400,
      detail: parsed.error.issues[0].message,
    });
  }

  try {
    const questions = await generateSimilarQuestions(
      parsed.data.referenceQuestion,
      parsed.data.topic,
      parsed.data.difficulty,
      parsed.data.count
    );
    res.status(201).json({ questions });
  } catch (err) {
    console.error(err);
    res.status(502).json({
      type: "about:blank",
      title: "Benzer Sorular Üretilemedi",
      status: 502,
      detail: "Yapay zeka servisinden benzer sorular alınamadı. Lütfen tekrar deneyin.",
    });
  }
});

questionsRouter.get("/", (req: AuthedRequest, res) => {
  const rows = store.getQuestionsByUser(req.userId!);
  res.json(
    rows.map((r) => ({
      id: r.id,
      question: r.question_text,
      topic: r.topic,
      difficulty: r.difficulty,
      solution_steps: r.solution_steps,
      formulas: r.formulas,
      final_answer: r.final_answer,
      created_at: r.created_at,
    }))
  );
});

questionsRouter.get("/topics", (req: AuthedRequest, res) => {
  res.json(store.getTopicsByUser(req.userId!));
});
