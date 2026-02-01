"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";

type Status = "idle" | "recording" | "uploading" | "done" | "error";

function PracticeContent() {
  const searchParams = useSearchParams();
  const cardId = searchParams.get("cardId");
  const [referenceText, setReferenceText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!cardId) return;
    (async () => {
      const card = await db.savedCards.get(cardId);
      if (card) setReferenceText(card.polite);
      else setReferenceText("");
    })();
  }, [cardId]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
      setError("");
      setScore(null);
      setFeedback("");
    } catch (e) {
      setError("Microphone access denied or unavailable.");
      setStatus("error");
    }
  }, []);

  const stopAndSubmit = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || status !== "recording") return;
    setStatus("uploading");

    const blobPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        resolve(blob);
      };
    });
    recorder.stop();
    const blob = await blobPromise;
    const fallback = cardId ? (await db.savedCards.get(cardId))?.polite : "";
    const text = (referenceText || fallback) ?? "";

    if (!text) {
      setError("No reference sentence. Open practice from a saved card.");
      setStatus("error");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("referenceText", text);
      const res = await fetch("/api/practice/feedback", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Feedback request failed");
      }
      const data = await res.json();
      setScore(data.score ?? 0);
      setFeedback(data.feedback ?? "");
      setStatus("done");
      if (cardId && data.score != null && data.feedback) {
        await db.practiceAttempts.put({
          id: `attempt-${cardId}-${Date.now()}`,
          cardId,
          score: data.score,
          feedbackText: data.feedback,
          createdAt: Date.now(),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  }, [status, referenceText, cardId]);

  const reset = useCallback(() => {
    setStatus("idle");
    setScore(null);
    setFeedback("");
    setError("");
  }, []);

  if (!cardId && !referenceText) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-[#1a1a1a]">Practice</h1>
          <p className="mt-2 text-[#424242]">
            Open a saved card from the Library and tap Practice, or go to the stack and save a card first.
          </p>
          <Link href="/library" className="mt-4 inline-block text-[#fe3c72] font-semibold underline">
            Go to Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-[#1a1a1a]">Practice</h1>
      <p className="mt-2 text-sm text-[#424242] mb-6">
        Listen to the sentence, then record yourself repeating it. You’ll get a score and short feedback.
      </p>

      {referenceText && (
        <div className="rounded-2xl bg-[#f5f5f5] p-5 mb-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <p className="text-lg font-semibold text-[#1a1a1a]" lang="ja">
            {referenceText}
          </p>
        </div>
      )}

      {status === "idle" && (
        <button
          type="button"
          onClick={startRecording}
          className="w-full min-h-[3rem] inline-flex items-center justify-center py-3.5 px-4 rounded-full bg-[#fe3c72] text-white font-semibold hover:bg-[#e63568] focus:outline-none focus:ring-2 focus:ring-[#fe3c72] focus:ring-offset-2 shadow-[0_2px_12px_rgba(254,60,114,0.4)]"
        >
          Start recording
        </button>
      )}

      {(status === "recording" || status === "uploading") && (
        <button
          type="button"
          onClick={status === "recording" ? stopAndSubmit : undefined}
          disabled={status === "uploading"}
          className="w-full min-h-[3rem] inline-flex items-center justify-center py-3.5 px-4 rounded-full bg-[#424242] text-white font-semibold hover:bg-[#333] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#424242] focus:ring-offset-2 shadow-[0_2px_12px_rgba(0,0,0,0.15)]"
        >
          {status === "recording" ? "Stop and get feedback" : "Uploading…"}
        </button>
      )}

      {status === "done" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <p className="text-sm font-semibold text-[#9e9e9e] mb-1">Score</p>
            <p className="text-2xl font-bold text-[#1a1a1a]">{score ?? 0} / 100</p>
            <p className="mt-3 text-sm text-[#424242]">{feedback}</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="w-full min-h-[3rem] inline-flex items-center justify-center py-3.5 px-4 rounded-full bg-[#00e676] text-white font-semibold hover:bg-[#00d66b] focus:outline-none focus:ring-2 focus:ring-[#00e676] focus:ring-offset-2 shadow-[0_2px_12px_rgba(0,230,118,0.35)]"
          >
            Try again
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-3">
          <p className="text-[#fe3c72] text-sm font-medium">{error}</p>
          <button
            type="button"
            onClick={reset}
            className="w-full min-h-[3rem] inline-flex items-center justify-center py-3.5 px-4 rounded-full border-2 border-[#e0e0e0] text-[#424242] font-semibold hover:bg-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#1da1f2]"
          >
            Try again
          </button>
        </div>
      )}

      <Link href="/library" className="mt-6 inline-block text-[#9e9e9e] text-sm font-medium underline hover:text-[#424242]">
        Back to Library
      </Link>
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="p-6 text-[#9e9e9e] font-medium">Loading…</div>}>
      <PracticeContent />
    </Suspense>
  );
}
