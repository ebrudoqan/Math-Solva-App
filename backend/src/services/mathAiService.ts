import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface SolvedQuestion {
  topic: string;
  difficulty: "Kolay" | "Orta" | "Zor";
  solution_steps: string[];
  formulas: string[];
  final_answer: string;
}

// JSON yerine düz metin + belirteç formatı kullanıyoruz çünkü LaTeX'teki ters eğik çizgiler
// (\frac, \sqrt gibi) yapay zeka tarafından JSON içinde tutarlı şekilde kaçırılmayabiliyor
// ve bu da JSON.parse hatalarına yol açıyor. Bu format buna karşı bağışık.
const SOLVE_FORMAT_INSTRUCTIONS = `Cevabını TAM OLARAK şu formatta ver, başka hiçbir şey ekleme:

TOPIC: <konu adı, kısa>
DIFFICULTY: <Kolay veya Orta veya Zor>
STEPS:
1. <ilk adım açıklaması>
2. <ikinci adım açıklaması>
(gerektiği kadar adım devam et)
FORMULAS:
- <formül 1>
- <formül 2>
(formül yoksa bu bölümü boş bırak)
ANSWER: <sonuç>

Matematiksel ifadeleri LaTeX formatında, $ işaretleri arasında yaz (örn: $\\frac{4\\sqrt{6}}{3}$).`;

function parseSolvedFormat(text: string): SolvedQuestion {
  const topicMatch = text.match(/TOPIC:\s*(.+)/);
  const difficultyMatch = text.match(/DIFFICULTY:\s*(.+)/);
  const answerMatch = text.match(/ANSWER:\s*([\s\S]+?)\s*$/);

  const stepsBlock = text.split(/STEPS:/)[1]?.split(/FORMULAS:/)[0] || "";
  const solution_steps = stepsBlock
    .split("\n")
    .map((l) => l.replace(/^\s*\d+\.\s*/, "").trim())
    .filter((l) => l.length > 0);

  const formulasBlock = text.split(/FORMULAS:/)[1]?.split(/ANSWER:/)[0] || "";
  const formulas = formulasBlock
    .split("\n")
    .map((l) => l.replace(/^\s*-\s*/, "").trim())
    .filter((l) => l.length > 0);

  const difficultyRaw = (difficultyMatch?.[1] || "Orta").trim();
  const difficulty: SolvedQuestion["difficulty"] =
    difficultyRaw.includes("Kolay") ? "Kolay" : difficultyRaw.includes("Zor") ? "Zor" : "Orta";

  return {
    topic: (topicMatch?.[1] || "Genel").trim(),
    difficulty,
    solution_steps,
    formulas,
    final_answer: (answerMatch?.[1] || "").trim(),
  };
}

export async function solveMathQuestion(questionText: string): Promise<SolvedQuestion> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: `Sen bir matematik öğretmenisin. Sana verilen matematik sorusunu çöz.\n${SOLVE_FORMAT_INSTRUCTIONS}`,
    messages: [{ role: "user", content: questionText }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI yanıtı boş döndü.");
  }
  return parseSolvedFormat(textBlock.text);
}

export interface SolvedQuestionFromImage extends SolvedQuestion {
  extracted_question_text: string;
}

export async function solveMathQuestionFromImage(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png"
): Promise<SolvedQuestionFromImage> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: `Sen bir matematik öğretmenisin. Sana bir matematik sorusunun fotoğrafı verilecek. Önce fotoğraftaki soruyu oku, sonra çöz.
Cevabını TAM OLARAK şu formatta ver, başka hiçbir şey ekleme:

EXTRACTED: <fotoğraftan okuduğun soru metni>
TOPIC: <konu adı, kısa>
DIFFICULTY: <Kolay veya Orta veya Zor>
STEPS:
1. <ilk adım açıklaması>
2. <ikinci adım açıklaması>
FORMULAS:
- <formül 1>
ANSWER: <sonuç>

Matematiksel ifadeleri LaTeX formatında, $ işaretleri arasında yaz.`,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
          { type: "text", text: "Bu fotoğraftaki matematik sorusunu oku ve çöz." },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI yanıtı boş döndü.");
  }
  const text = textBlock.text;
  const extractedMatch = text.match(/EXTRACTED:\s*(.+)/);
  const parsed = parseSolvedFormat(text);
  return { ...parsed, extracted_question_text: (extractedMatch?.[1] || "").trim() };
}

export interface GeneratedExamQuestion {
  question_text: string;
  correct_answer: string;
}

export async function generateExamQuestions(
  topics: string[],
  count: number
): Promise<GeneratedExamQuestion[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: `Sen bir matematik sınav sorusu hazırlayıcısısın. Verilen konularda ${count} adet çeşitli zorlukta soru üret.
Matematiksel ifadeleri LaTeX formatında $ işaretleri arasında yaz.
Cevabını TAM OLARAK şu formatta ver, her soru için bir Q/A çifti, başka hiçbir şey ekleme:

Q: <soru metni>
A: <doğru cevap>
Q: <soru metni>
A: <doğru cevap>
(toplam ${count} çift)`,
    messages: [{ role: "user", content: `Konular: ${topics.join(", ")}. ${count} soru üret.` }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI yanıtı boş döndü.");
  }

  const lines = textBlock.text.split("\n").map((l) => l.trim()).filter(Boolean);
  const questions: GeneratedExamQuestion[] = [];
  let currentQ: string | null = null;
  for (const line of lines) {
    if (line.startsWith("Q:")) {
      currentQ = line.slice(2).trim();
    } else if (line.startsWith("A:") && currentQ) {
      questions.push({ question_text: currentQ, correct_answer: line.slice(2).trim() });
      currentQ = null;
    }
  }
  return questions;
}

export async function extractQuestionFromImage(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png"
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: `Sana bir matematik sorusunun fotoğrafı verilecek. Sadece fotoğraftaki soru metnini oku ve yaz.
Düz, okunabilir metin kullan (örn: 4√6/3, x^2 - 5x + 6 = 0, √(2/3)). LaTeX kodu (\\frac, \\sqrt, $ işaretleri vb.) KULLANMA — kullanıcı bu metni kendi elleriyle düzenleyecek, LaTeX kodu onun için okunmaz olur.
SADECE okuduğun soru metnini döndür, başka hiçbir açıklama ekleme.`,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
          { type: "text", text: "Bu fotoğraftaki matematik sorusunu oku ve sadece metnini yaz." },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI yanıtı boş döndü.");
  }
  return textBlock.text.trim();
}

export async function generateSimilarQuestion(
  referenceQuestion: string,
  topic: string,
  difficulty: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: `Sen bir matematik sınav sorusu hazırlayıcısısın. Sana bir referans soru, konu ve zorluk seviyesi verilecek.
Aynı konuda, aynı zorluk seviyesinde ama FARKLI sayılar/farklı bağlam içeren yeni bir soru üret.
Matematiksel ifadeleri LaTeX formatında $ işaretleri arasında yaz.
SADECE yeni sorunun metnini döndür, başka hiçbir açıklama ekleme.`,
    messages: [
      {
        role: "user",
        content: `Konu: ${topic}\nZorluk: ${difficulty}\nReferans soru: ${referenceQuestion}\n\nBenzer yeni bir soru üret.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI yanıtı boş döndü.");
  }
  return textBlock.text.trim();
}

export async function generateSimilarQuestions(
  referenceQuestion: string,
  topic: string,
  difficulty: string,
  count: number
): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: `Sen bir matematik sınav sorusu hazırlayıcısısın. Sana bir referans soru, konu ve zorluk seviyesi verilecek.
Aynı konuda, aynı zorluk seviyesinde ama FARKLI sayılar/farklı bağlam içeren ${count} adet YENİ soru üret. Sorular birbirinden de farklı olmalı.
Matematiksel ifadeleri LaTeX formatında $ işaretleri arasında yaz.
Cevabını TAM OLARAK şu formatta ver, başka hiçbir şey ekleme:

1. <soru 1>
2. <soru 2>
(toplam ${count} soru)`,
    messages: [
      {
        role: "user",
        content: `Konu: ${topic}\nZorluk: ${difficulty}\nReferans soru: ${referenceQuestion}\n\n${count} adet benzer yeni soru üret.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI yanıtı boş döndü.");
  }

  return textBlock.text
    .split("\n")
    .map((l) => l.replace(/^\s*\d+\.\s*/, "").trim())
    .filter((l) => l.length > 0);
}
