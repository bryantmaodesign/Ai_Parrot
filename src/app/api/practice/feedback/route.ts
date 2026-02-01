import { NextResponse } from "next/server";
import OpenAI from "openai";

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: key });
}

export async function POST(request: Request) {
  try {
    const openai = getOpenAI();
    const formData = await request.formData();
    const audio = formData.get("audio");
    const referenceText = (formData.get("referenceText") as string)?.trim();

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing audio file" },
        { status: 400 }
      );
    }
    if (!referenceText) {
      return NextResponse.json(
        { error: "Missing referenceText" },
        { status: 400 }
      );
    }

    // Whisper expects a File-like object. In Node we get a Blob; create a File for the API.
    const file = new File([audio], "recording.webm", { type: audio.type || "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "ja",
      response_format: "text",
    });

    const userText = String(transcription ?? "").trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a Japanese shadowing coach. The user repeated a Japanese sentence. Compare their transcription to the reference and give:
1. A score from 0 to 100 (accuracy and pronunciation quality).
2. One or two short sentences of feedback in English (what was good, what to improve).
Return ONLY valid JSON: { "score": number, "feedback": "string" }. No other text.`,
        },
        {
          role: "user",
          content: `Reference sentence: ${referenceText}\nUser said (transcribed): ${userText}`,
        },
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "No feedback from model" },
        { status: 500 }
      );
    }

    let jsonStr = content;
    const codeMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeMatch) jsonStr = codeMatch[1].trim();
    const { score, feedback } = JSON.parse(jsonStr) as { score?: number; feedback?: string };

    const finalScore = typeof score === "number" ? Math.round(Math.max(0, Math.min(100, score))) : 70;
    const finalFeedback = typeof feedback === "string" ? feedback : "Good attempt. Keep practicing!";

    return NextResponse.json({
      score: finalScore,
      feedback: finalFeedback,
      transcript: userText,
    });
  } catch (err) {
    console.error("Practice feedback error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Feedback failed" },
      { status: 500 }
    );
  }
}
