import { NextResponse } from "next/server";
import OpenAI from "openai";

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: key });
}

export interface FuriganaSegment {
  text: string;
  reading?: string;
}

export interface GenerateSentence {
  sentence: string;
  reading?: string;
  casual?: string;
  polite?: string;
  translation?: string;
  furiganaPolite?: FuriganaSegment[];
  furiganaCasual?: FuriganaSegment[];
}

export async function POST(request: Request) {
  try {
    const openai = getOpenAI();
    const body = await request.json();
    const vocabulary: string[] = Array.isArray(body.vocabulary) ? body.vocabulary : [];
    const count = Math.min(Math.max(Number(body.count) || 5, 1), 10);
    const level = ["N5", "N4", "N3", "N2", "N1"].includes(body.level)
      ? body.level
      : "N5";

    const jlptDescription: Record<string, string> = {
      N5: "JLPT N5 (beginner): basic grammar, ~100 kanji, simple daily expressions, short sentences",
      N4: "JLPT N4 (elementary): basic grammar and ~300 kanji, everyday topics, simple compound sentences",
      N3: "JLPT N3 (intermediate): bridge level, daily life and news, moderate grammar and kanji",
      N2: "JLPT N2 (upper intermediate): most daily situations, newspapers, business Japanese, complex grammar",
      N1: "JLPT N1 (advanced): complex texts, abstract topics, full kanji use, native-level grammar",
    };
    const levelDesc = jlptDescription[level] ?? jlptDescription.N5;

    const systemPrompt =
      vocabulary.length > 0
        ? `You are a Japanese language teacher. Generate natural Japanese shadowing sentences that USE the given vocabulary words. Difficulty: ${levelDesc}. For each sentence provide:
1. sentence: the main Japanese sentence (use the vocabulary words)
2. casual: the same meaning in casual spoken form (if different from sentence)
3. polite: the same meaning in polite form (if different from sentence)
4. furiganaPolite: array of segments for the polite form, e.g. [{"text":"私","reading":"わたし"},{"text":"は"},{"text":"学生","reading":"がくせい"},{"text":"です。"}] - use "text" for each chunk (kanji or kana), and "reading" (hiragana) only for kanji chunks
5. furiganaCasual: same structure for the casual form
6. translation: English translation of the sentence (one short sentence)
Return ONLY a valid JSON array of objects with keys: sentence, casual (optional), polite (optional), furiganaPolite, furiganaCasual, translation. No other text.`
        : `You are a Japanese language teacher. Generate natural Japanese shadowing sentences. Difficulty: ${levelDesc}. Match grammar, kanji, and sentence complexity strictly to this level. For each sentence provide:
1. sentence: the main Japanese sentence
2. casual: the same meaning in casual spoken form (if different)
3. polite: the same meaning in polite form (if different)
4. furiganaPolite: array of segments for the polite form, e.g. [{"text":"私","reading":"わたし"},{"text":"は"},{"text":"学生","reading":"がくせい"},{"text":"です。"}] - "text" for each chunk, "reading" (hiragana) only for kanji
5. furiganaCasual: same structure for the casual form
6. translation: English translation of the sentence (one short sentence)
Return ONLY a valid JSON array of objects with keys: sentence, casual (optional), polite (optional), furiganaPolite, furiganaCasual, translation. No other text.`;

    const userPrompt =
      vocabulary.length > 0
        ? `Vocabulary words to use in the sentences: ${vocabulary.join(", ")}. Generate exactly ${count} different sentences at ${level} level (${levelDesc}).`
        : `Generate exactly ${count} different Japanese sentences at ${level} level. Match the difficulty strictly: ${levelDesc}.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "No response from model" },
        { status: 500 }
      );
    }

    // Parse JSON from response (handle possible markdown code block)
    let jsonStr = content;
    const codeMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeMatch) jsonStr = codeMatch[1].trim();
    const sentences: GenerateSentence[] = JSON.parse(jsonStr);

    if (!Array.isArray(sentences) || sentences.length === 0) {
      return NextResponse.json(
        { error: "Invalid sentence format" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sentences });
  } catch (err) {
    console.error("Generate sentences error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate sentences" },
      { status: 500 }
    );
  }
}
