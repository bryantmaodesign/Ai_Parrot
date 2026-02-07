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

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing audio file" },
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

    // When response_format is "text", the API returns a plain string directly
    // The OpenAI SDK may return it as a string or wrapped, so handle both cases
    let text: string;
    if (typeof transcription === "string") {
      text = transcription.trim();
    } else if (transcription && typeof transcription === "object" && "text" in transcription) {
      text = String((transcription as any).text).trim();
    } else {
      text = String(transcription ?? "").trim();
    }

    console.log("Transcribed text:", text);
    console.log("Transcription type:", typeof transcription);
    console.log("Transcription value:", transcription);

    return NextResponse.json({
      text,
    });
  } catch (err) {
    console.error("Transcription error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 500 }
    );
  }
}
