import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { store } from "../db/db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { generateExamQuestions } from "../services/mathAiService";

export const examRouter = Router();
examRouter.use(requireAuth);

const startSchema = z.object({
  topics: z.array(z.string()).min(1, "En az bir konu seçilmeli."),
  durationMinutes: z.number().int().min(1).max(180),
  questionCount: z.number().int().min(3).max(30).default(10),
});

examRouter.post("/start", async (req: AuthedRequest, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      type: "about:blank",
      title: "Doğrulama Hatası",
      status: 400,
      detail: parsed.error.issues[0].message,
    });
  }
  const { topics, durationMinutes, questionCount } = parsed.data;

  try {
    const questions = await generateExamQuestions(topics, questionCount);
    const id = uuidv4();

    store.createExamAttempt({
      id,
      user_id: req.userId!,
      topics,
      duration_minutes: durationMinutes,
      questions,
    });

    res.status(201).json({
      examId: id,
      durationMinutes,
      endsAt: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString(),
      questions: questions.map((q, i) => ({ index: i, question_text: q.question_text })),
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({
      type: "about:blank",
      title: "Sınav Oluşturulamadı",
      status: 502,
      detail: "Yapay zeka servisinden sorular üretilemedi.",
    });
  }
});

const submitSchema = z.object({
  answers: z.array(z.object({ index: z.number(), answer: z.string() })),
});

examRouter.post("/:id/submit", (req: AuthedRequest, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      type: "about:blank",
      title: "Doğrulama Hatası",
      status: 400,
      detail: "Geçerli bir cevap listesi gerekli.",
    });
  }

  const attempt = store.getExamAttempt(req.params.id, req.userId!);
  if (!attempt) {
    return res.status(404).json({
      type: "about:blank",
      title: "Bulunamadı",
      status: 404,
      detail: "Sınav bulunamadı.",
    });
  }

  const questions = attempt.questions as { correct_answer: string }[];
  let correct = 0;
  for (const a of parsed.data.answers) {
    const q = questions[a.index];
    if (q && q.correct_answer.trim().toLowerCase() === a.answer.trim().toLowerCase()) {
      correct++;
    }
  }
  const score = (correct / questions.length) * 100;

  store.submitExamAttempt(attempt.id, parsed.data.answers, score);

  res.json({
    examId: attempt.id,
    score,
    correctCount: correct,
    totalCount: questions.length,
    review: questions.map((q, i) => ({
      index: i,
      correct_answer: q.correct_answer,
      user_answer: parsed.data.answers.find((a) => a.index === i)?.answer ?? null,
    })),
  });
});

examRouter.get("/history", (req: AuthedRequest, res) => {
  res.json(store.getExamHistory(req.userId!));
});
