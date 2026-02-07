"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QueueCard } from "@/hooks/useCardQueue";
import { useRecording } from "@/contexts/RecordingContext";

const SWIPE_THRESHOLD = 80;

type PracticeStatus = "idle" | "recording" | "uploading" | "done" | "error";

interface CardStackProps {
  cards: QueueCard[];
  onSkip: () => void;
  onSave: () => void | Promise<void>;
  onSaveToLibrary: () => void | Promise<void>;
  isCurrentCardSaved: boolean;
  onToggleForm: () => void;
  onSaved?: () => void;
  triggerRecord?: boolean;
}

function NextCardPreview({ card }: { card: QueueCard }) {
  const furiganaSegments = card.displayForm === "casual" ? card.furiganaCasual : card.furiganaPolite;
  const displayText = card.displayForm === "casual" ? card.casual : card.polite;
  return (
    <div
      className="absolute left-5 right-5 top-0 z-0 rounded-3xl bg-[#f0f0f0] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] pointer-events-none min-h-[22rem] flex flex-col"
      aria-hidden
    >
      <div className="flex shrink-0 rounded-full bg-[#e0e0e0] p-1 mb-5 h-10" />
      <div className="flex-1 flex flex-col justify-center">
        <p className="text-2xl font-semibold text-center text-[#6b6b6b] [ruby-align:center]" lang="ja">
          {furiganaSegments && furiganaSegments.length > 0 ? (
            furiganaSegments.map((seg, i) =>
              seg.reading ? (
                <ruby key={i}>
                  {seg.text}
                  <rt className="text-sm text-[#9e9e9e]">{seg.reading}</rt>
                </ruby>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            )
          ) : (
            displayText
          )}
        </p>
      </div>
    </div>
  );
}

export function CardStack({ cards, onSkip, onSave, onSaveToLibrary, isCurrentCardSaved, onToggleForm, onSaved, triggerRecord }: CardStackProps) {
  const card = cards[0] ?? null;
  const nextCard = cards[1] ?? null;
  const { registerHandlers, setRecording } = useRecording();
  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);
  const [practiceStatus, setPracticeStatus] = useState<PracticeStatus>("idle");
  const [practiceScore, setPracticeScore] = useState<number | null>(null);
  const [practiceFeedback, setPracticeFeedback] = useState("");
  const [practiceError, setPracticeError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Track active drag to avoid resetting during interaction
  const isDraggingRef = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX;
      isDraggingRef.current = true;
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const x = e.touches[0].clientX;
      const delta = x - startX.current;
      if (Math.abs(delta) > 10) {
        e.preventDefault();
        isDraggingRef.current = true;
      }
      setDragX(delta);
    },
    []
  );

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (dragX < -SWIPE_THRESHOLD) {
      onSkip();
      setDragX(0);
    } else if (dragX > SWIPE_THRESHOLD) {
      Promise.resolve(onSave()).then(() => onSaved?.());
      setDragX(0);
    } else {
      setDragX(0);
    }
  }, [dragX, onSkip, onSave, onSaved]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      startX.current = e.clientX;
      isDraggingRef.current = true;
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (e.buttons !== 1) return;
      isDraggingRef.current = true;
      setDragX(e.clientX - startX.current);
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    handleTouchEnd();
  }, [handleTouchEnd]);

  const handlePlayOrStop = useCallback(() => {
    if (!card) return;
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      audioRef.current = null;
      setIsPlaying(false);
      return;
    }
    const url = card.displayForm === "casual" ? card.casualAudioUrl : card.politeAudioUrl;
    if (!url) return;
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      audioRef.current = null;
    });
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [card, isPlaying]);

  const startRecording = useCallback(async () => {
    if (!card) return;
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
      setPracticeStatus("recording");
      setPracticeError("");
      setPracticeScore(null);
      setPracticeFeedback("");
    } catch {
      setPracticeError("Microphone access denied or unavailable.");
      setPracticeStatus("error");
    }
  }, [card]);

  const stopAndSubmit = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || practiceStatus !== "recording" || !card) return;
    setPracticeStatus("uploading");
    const blobPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
      };
    });
    recorder.stop();
    const blob = await blobPromise;
    const referenceText = card.displayForm === "casual" ? card.casual : card.polite;
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("referenceText", referenceText);
      const res = await fetch("/api/practice/feedback", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Feedback request failed");
      }
      const data = await res.json();
      setPracticeScore(data.score ?? 0);
      setPracticeFeedback(data.feedback ?? "");
      setPracticeStatus("done");
    } catch (e) {
      setPracticeError(e instanceof Error ? e.message : "Something went wrong.");
      setPracticeStatus("error");
    }
  }, [card, practiceStatus]);

  const displayText = card?.displayForm === "casual" ? card.casual : card?.polite;
  const furiganaSegments =
    card?.displayForm === "casual" ? card.furiganaCasual : card?.furiganaPolite;

  // Reset drag position when card changes to prevent jumps
  useEffect(() => {
    // Only reset drag position if we're not actively dragging
    if (!isDraggingRef.current) {
      setDragX(0);
    }
  }, [card?.id]);

  useEffect(() => {
    setPracticeStatus("idle");
    setPracticeScore(null);
    setPracticeFeedback("");
    setPracticeError("");
  }, [card?.id]);

  const triggerRecordRef = useRef(false);
  useEffect(() => {
    if (triggerRecord && card && practiceStatus === "idle" && !triggerRecordRef.current) {
      triggerRecordRef.current = true;
      startRecording();
    }
    if (!triggerRecord) triggerRecordRef.current = false;
  }, [triggerRecord, card, practiceStatus, startRecording]);

  useEffect(() => {
    setRecording(practiceStatus === "recording" || practiceStatus === "uploading");
  }, [practiceStatus, setRecording]);

  useEffect(() => {
    registerHandlers(startRecording, stopAndSubmit);
    return () => registerHandlers(null, null);
  }, [registerHandlers, startRecording, stopAndSubmit]);

  if (!card) return null;

  return (
    <div
      className="relative touch-none select-none mx-5 flex min-h-0 flex-1 flex-col"
      role="region"
      aria-label="Current card"
      aria-live="polite"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {nextCard && <NextCardPreview card={nextCard} />}
      <div
        className="relative z-10 flex min-h-0 flex-1 transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${dragX}px)` }}
      >
        <div
          key={card.id}
          className="card-pop-in rounded-3xl bg-white p-6 flex min-h-0 flex-1 flex-col shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
        >
        <div
          className="flex shrink-0 rounded-full bg-[#f5f5f5] p-1 mb-5"
          role="tablist"
          aria-label="Casual or polite"
        >
          <button
            type="button"
            role="tab"
            aria-selected={card.displayForm === "casual"}
            onClick={() => card.displayForm !== "casual" && onToggleForm()}
            className={`flex-1 min-h-[2.75rem] inline-flex items-center justify-center py-2.5 text-sm font-semibold rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[#1da1f2] focus:ring-offset-2 ${
              card.displayForm === "casual"
                ? "bg-white text-[#1a1a1a] shadow-sm"
                : "bg-transparent text-[#9e9e9e]"
            }`}
          >
            Casual
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={card.displayForm === "polite"}
            onClick={() => card.displayForm !== "polite" && onToggleForm()}
            className={`flex-1 min-h-[2.75rem] inline-flex items-center justify-center py-2.5 text-sm font-semibold rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[#1da1f2] focus:ring-offset-2 ${
              card.displayForm === "polite"
                ? "bg-white text-[#1a1a1a] shadow-sm"
                : "bg-transparent text-[#9e9e9e]"
            }`}
          >
            Polite
          </button>
        </div>

        {/* Sentence + translation: centered when no feedback; pushed up when feedback appears */}
        {(() => {
          const hasFeedback =
            practiceStatus === "done" ||
            practiceStatus === "error" ||
            practiceStatus === "uploading";
          return (
            <div
              className={`flex-1 flex min-h-0 flex-col mb-8 transition-all duration-300 ${
                hasFeedback ? "justify-start" : "justify-center"
              }`}
            >
              <div className="text-center">
                <p
                  className="text-2xl font-semibold text-[#1a1a1a] min-h-[3rem] [ruby-align:center]"
                  lang="ja"
                >
                  {furiganaSegments && furiganaSegments.length > 0 ? (
                    furiganaSegments.map((seg, i) =>
                      seg.reading ? (
                        <ruby key={i}>
                          {seg.text}
                          <rt className="text-sm text-[#9e9e9e]">{seg.reading}</rt>
                        </ruby>
                      ) : (
                        <span key={i}>{seg.text}</span>
                      )
                    )
                  ) : (
                    displayText
                  )}
                </p>
                {card.translation && (
                  <p className="text-sm text-[#424242] mt-1.5">{card.translation}</p>
                )}
              </div>
              {hasFeedback && (
                <div className="mt-6 flex flex-col rounded-xl bg-[#f0f0f0] p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {practiceStatus === "done" && practiceScore != null && (
                    <>
                      <p className="text-sm font-semibold text-[#1a1a1a] mb-1">
                        Score: {practiceScore} / 100
                      </p>
                      <p className="text-sm text-[#424242]">{practiceFeedback}</p>
                    </>
                  )}
                  {practiceStatus === "error" && (
                    <p className="text-sm text-[#fe3c72]">{practiceError}</p>
                  )}
                  {practiceStatus === "uploading" && (
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#9e9e9e] border-t-transparent"
                        aria-hidden
                      />
                      <p className="text-sm text-[#9e9e9e]">Getting feedback…</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Action buttons: Play/Stop (left), Record/Stop (middle), Save (right) */}
        <div className="flex shrink-0 items-center justify-center gap-6">
          <button
            type="button"
            onClick={handlePlayOrStop}
            className="relative flex shrink-0 h-14 w-14 min-h-14 min-w-14 items-center justify-center rounded-full bg-white text-[#1da1f2] shadow-[0_2px_12px_rgba(0,0,0,0.1)] hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-[#1da1f2] focus:ring-offset-2"
            aria-label={isPlaying ? "Stop playback" : "Play sentence"}
          >
            {isPlaying && (
              <span className="absolute inset-0 rounded-full bg-[#1da1f2]/15 animate-play-ripple pointer-events-none" aria-hidden />
            )}
            {isPlaying ? (
              <svg className="relative h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg className="relative h-7 w-7 shrink-0 ml-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => (practiceStatus === "recording" ? stopAndSubmit() : startRecording())}
            className={`flex shrink-0 h-16 w-16 min-h-16 min-w-16 items-center justify-center rounded-full text-white shadow-[0_2px_12px_rgba(0,0,0,0.1)] hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              practiceStatus === "recording" || practiceStatus === "uploading"
                ? "bg-[#424242] focus:ring-[#424242] animate-pulse"
                : "bg-[#fe3c72] hover:bg-[#e63568] focus:ring-[#fe3c72]"
            }`}
            aria-label={practiceStatus === "recording" ? "Stop recording" : "Record"}
            disabled={practiceStatus === "uploading"}
          >
            {practiceStatus === "recording" || practiceStatus === "uploading" ? (
              <span className="h-5 w-5 shrink-0 rounded-sm bg-white" aria-hidden />
            ) : (
              <svg className="h-7 w-7 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => Promise.resolve(onSaveToLibrary()).then(() => onSaved?.())}
            className={`flex shrink-0 h-14 w-14 min-h-14 min-w-14 items-center justify-center rounded-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.1)] hover:scale-105 active:scale-95 transition-colors transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCurrentCardSaved ? "text-[#00e676] focus:ring-[#00e676]" : "text-[#9e9e9e] focus:ring-[#9e9e9e]"}`}
            aria-label="Save to library"
          >
            <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
