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
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json(
        { error: "Missing or empty text" },
        { status: 400 }
      );
    }
    const rawSpeed = typeof body.speed === "number" ? body.speed : 1.0;
    const speed = Math.min(1.2, Math.max(0.8, Math.round(rawSpeed * 10) / 10));

    // gpt-4o-mini-tts supports Japanese; tts-1/tts-1-hd do not read Japanese correctly.
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "nova",
      input: text,
      response_format: "mp3",
      speed,
      instructions: "Read the following text in natural Japanese. Do not translate. Pronounce exactly as written, as a native Japanese speaker would.",
    });

    const arrayBuffer = await speech.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("TTS error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "TTS failed" },
      { status: 500 }
    );
  }
}
