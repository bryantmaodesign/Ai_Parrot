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
    const image = formData.get("image");

    if (!image || !(image instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing image file" },
        { status: 400 }
      );
    }

    // Convert blob to base64 for OpenAI vision API
    const arrayBuffer = await image.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = image.type || "image/jpeg";

    // Use OpenAI vision API to extract text and translate if needed
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a Japanese language assistant. Extract text from images and translate to Japanese if needed.

Rules:
1. Extract ALL visible text from the image using OCR
2. If the text is in English or Chinese, translate it to Japanese
3. If the text is already in Japanese, return it as-is
4. Focus on extracting words/phrases that would be useful for vocabulary learning
5. If multiple words are found, return them separated by spaces or commas
6. Return ONLY the extracted/translated Japanese text, no explanations`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract text from this image. If it's English or Chinese, translate to Japanese. Return only the Japanese text.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const extractedText = completion.choices[0]?.message?.content?.trim();

    if (!extractedText) {
      return NextResponse.json(
        { error: "No text extracted from image" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      text: extractedText,
    });
  } catch (err) {
    console.error("OCR/Translation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "OCR/Translation failed" },
      { status: 500 }
    );
  }
}
