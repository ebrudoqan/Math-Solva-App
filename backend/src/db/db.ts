import fs from "fs";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "..", "mathapp-data.json");

interface DbShape {
  users: any[];
  refreshTokens: any[];
  questions: any[];
  examAttempts: any[];
}

function loadData(): DbShape {
  if (!fs.existsSync(DB_PATH)) {
    const empty: DbShape = { users: [], refreshTokens: [], questions: [], examAttempts: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

let data = loadData();

function persist() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export const store = {
  findUserByEmail(email: string) {
    return data.users.find((u) => u.email === email) || null;
  },
  findUserById(id: string) {
    return data.users.find((u) => u.id === id) || null;
  },
  createUser(user: { id: string; email: string; password_hash: string; name: string | null }) {
    const row = { ...user, created_at: new Date().toISOString() };
    data.users.push(row);
    persist();
    return row;
  },

  createRefreshToken(row: { id: string; user_id: string; token_hash: string; expires_at: string }) {
    data.refreshTokens.push({ ...row, revoked: false, created_at: new Date().toISOString() });
    persist();
  },
  findValidRefreshToken(tokenHash: string) {
    const now = new Date().toISOString();
    return (
      data.refreshTokens.find(
        (t) => t.token_hash === tokenHash && !t.revoked && t.expires_at > now
      ) || null
    );
  },
  revokeRefreshTokenById(id: string) {
    const t = data.refreshTokens.find((t) => t.id === id);
    if (t) t.revoked = true;
    persist();
  },
  revokeRefreshTokenByHash(tokenHash: string) {
    const t = data.refreshTokens.find((t) => t.token_hash === tokenHash);
    if (t) t.revoked = true;
    persist();
  },

  addQuestion(row: {
    id: string;
    user_id: string;
    question_text: string;
    topic: string;
    difficulty: string;
    solution_steps: string[];
    formulas: string[];
    final_answer: string;
  }) {
    data.questions.push({ ...row, created_at: new Date().toISOString() });
    persist();
  },
  getQuestionsByUser(userId: string) {
    return data.questions
      .filter((q) => q.user_id === userId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },
  getTopicsByUser(userId: string) {
    const qs = data.questions.filter((q) => q.user_id === userId);
    const map = new Map<string, { topic: string; question_count: number; last_asked: string }>();
    for (const q of qs) {
      const existing = map.get(q.topic);
      if (existing) {
        existing.question_count++;
        if (q.created_at > existing.last_asked) existing.last_asked = q.created_at;
      } else {
        map.set(q.topic, { topic: q.topic, question_count: 1, last_asked: q.created_at });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.question_count - a.question_count);
  },

  createExamAttempt(row: {
    id: string;
    user_id: string;
    topics: string[];
    duration_minutes: number;
    questions: { question_text: string; correct_answer: string }[];
  }) {
    data.examAttempts.push({
      ...row,
      answers: null,
      score: null,
      status: "in_progress",
      started_at: new Date().toISOString(),
      finished_at: null,
    });
    persist();
  },
  getExamAttempt(id: string, userId: string) {
    return data.examAttempts.find((e) => e.id === id && e.user_id === userId) || null;
  },
  submitExamAttempt(id: string, answers: any[], score: number) {
    const attempt = data.examAttempts.find((e) => e.id === id);
    if (attempt) {
      attempt.answers = answers;
      attempt.score = score;
      attempt.status = "completed";
      attempt.finished_at = new Date().toISOString();
    }
    persist();
  },
  getExamHistory(userId: string) {
    return data.examAttempts
      .filter((e) => e.user_id === userId)
      .sort((a, b) => (a.started_at < b.started_at ? 1 : -1))
      .map((e) => ({
        id: e.id,
        topics: e.topics,
        duration_minutes: e.duration_minutes,
        score: e.score,
        status: e.status,
        started_at: e.started_at,
        finished_at: e.finished_at,
      }));
  },
};
