"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { db } from "@/lib/db";
import { useSettings, type JlptLevel } from "@/contexts/SettingsContext";

const REFILL_THRESHOLD = 1; // when 1 card left, load the next one in background

export interface FuriganaSegment {
  text: string;
  reading?: string;
}

export interface QueueCard {
  id: string;
  sentence: string;
  reading?: string;
  casual: string;
  polite: string;
  translation?: string;
  displayForm: "casual" | "polite";
  casualAudioUrl: string | null;
  politeAudioUrl: string | null;
  furiganaPolite?: FuriganaSegment[];
  furiganaCasual?: FuriganaSegment[];
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function fetchSentences(count: number, level: JlptLevel = "N5"): Promise<Array<{
  sentence: string;
  reading?: string;
  casual?: string;
  polite?: string;
  translation?: string;
  furiganaPolite?: FuriganaSegment[];
  furiganaCasual?: FuriganaSegment[];
}>> {
  const vocab = await db.vocabulary.toArray();
  const vocabulary = vocab.map((v) => v.word);
  const res = await fetch("/api/sentences/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vocabulary, count, level }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || "Failed to generate sentences";
    throw new Error(res.status === 500 && msg.includes("API") ? "Server error: add OPENAI_API_KEY to .env.local" : msg);
  }
  return data.sentences ?? [];
}

async function fetchTTS(text: string, speed: number = 1.0): Promise<Blob> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speed }),
  });
  if (!res.ok) throw new Error("TTS failed");
  return res.blob();
}

async function buildCard(
  raw: {
    sentence: string;
    reading?: string;
    casual?: string;
    polite?: string;
    translation?: string;
    furiganaPolite?: FuriganaSegment[];
    furiganaCasual?: FuriganaSegment[];
  },
  speed: number = 1.0
): Promise<QueueCard> {
  const id = generateId();
  const casual = raw.casual ?? raw.sentence;
  const polite = raw.polite ?? raw.sentence;
  const [casualBlob, politeBlob] = await Promise.all([
    fetchTTS(casual, speed).catch(() => null),
    fetchTTS(polite, speed).catch(() => null),
  ]);
  return {
    id,
    sentence: raw.sentence,
    reading: raw.reading,
    casual,
    polite,
    translation: raw.translation,
    displayForm: "casual",
    casualAudioUrl: casualBlob ? URL.createObjectURL(casualBlob) : null,
    politeAudioUrl: politeBlob ? URL.createObjectURL(politeBlob) : null,
    furiganaPolite: raw.furiganaPolite,
    furiganaCasual: raw.furiganaCasual,
  };
}

type CardQueueValue = {
  queue: QueueCard[];
  loading: boolean;
  error: string | null;
  skip: () => void;
  save: () => Promise<void>;
  saveToLibrary: () => Promise<void>;
  isCurrentCardSaved: boolean;
  toggleForm: () => void;
  refillNewSet: () => Promise<void>;
};

const CardQueueContext = createContext<CardQueueValue | null>(null);

export function CardQueueProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [queue, setQueue] = useState<QueueCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedCardIds, setSavedCardIds] = useState<Set<string>>(() => new Set());
  const refillingRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);

  /** Load exactly one card and append to queue (background). */
  const loadOneMore = useCallback(async () => {
    if (refillingRef.current) return;
    refillingRef.current = true;
    const level = settings.jlptLevel;
    const speed = settings.speed;
    try {
      const sentences = await fetchSentences(1, level);
      if (sentences.length === 0) return;
      const card = await buildCard(sentences[0], speed).catch(() => null);
      if (card) setQueue((prev) => [...prev, card]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cards");
    } finally {
      refillingRef.current = false;
    }
  }, [settings.jlptLevel, settings.speed]);

  const refillNewSet = useCallback(async () => {
    const level = settings.jlptLevel;
    const speed = settings.speed;
    setError(null);
    setLoading(true);
    setQueue([]);
    try {
      const sentences = await fetchSentences(1, level);
      if (sentences.length === 0) return;
      const card = await buildCard(sentences[0], speed).catch(() => null);
      if (card) {
        setQueue([card]);
        void loadOneMore(); // prepare next card in background
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }, [loadOneMore, settings.jlptLevel, settings.speed]);

  // Initial load: one card first, then prepare next in background
  useEffect(() => {
    if (hasLoadedOnceRef.current) return;
    hasLoadedOnceRef.current = true;

    const level = settings.jlptLevel;
    const speed = settings.speed;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      setError("Taking too long. Check OPENAI_API_KEY in .env.local and your connection.");
      setLoading(false);
    }, 20000);

    (async () => {
      try {
        const sentences = await fetchSentences(1, level);
        if (cancelled) return;
        if (sentences.length === 0) {
          setLoading(false);
          return;
        }
        const card = await buildCard(sentences[0], speed).catch(() => null);
        if (cancelled) return;
        window.clearTimeout(timeout);
        if (!cancelled && card) {
          setQueue([card]);
          void loadOneMore(); // prepare next card in background
        } else if (!cancelled) {
          setError("Could not build the first card. Try again.");
        }
      } catch (e) {
        window.clearTimeout(timeout);
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load cards");
        if (!cancelled) setLoading(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      hasLoadedOnceRef.current = false; // allow second mount (e.g. Strict Mode) to run initial load and call setLoading(false)
      window.clearTimeout(timeout);
    };
  }, [loadOneMore, settings.jlptLevel, settings.speed]);

  // When one card left, load the next one in background (same for refill)
  useEffect(() => {
    if (queue.length > 0 && queue.length <= REFILL_THRESHOLD && !refillingRef.current) {
      void loadOneMore();
    }
  }, [queue.length, loadOneMore]);

  const skip = useCallback(() => {
    setQueue((prev) => {
      const next = prev.slice(1);
      const top = prev[0];
      if (top?.casualAudioUrl) URL.revokeObjectURL(top.casualAudioUrl);
      if (top?.politeAudioUrl) URL.revokeObjectURL(top.politeAudioUrl);
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    const top = queue[0];
    if (!top) return;
    await db.savedCards.add({
      id: top.id,
      sentence: top.sentence,
      reading: top.reading,
      casual: top.casual,
      polite: top.polite,
      createdAt: Date.now(),
      savedAt: Date.now(),
    });
    setQueue((prev) => {
      if (prev[0]?.id !== top.id) return prev;
      const next = prev.slice(1);
      if (top.casualAudioUrl) URL.revokeObjectURL(top.casualAudioUrl);
      if (top.politeAudioUrl) URL.revokeObjectURL(top.politeAudioUrl);
      return next;
    });
  }, [queue]);

  /** Save current card to library without advancing to the next card. */
  const saveToLibrary = useCallback(async () => {
    const top = queue[0];
    if (!top) return;
    await db.savedCards.add({
      id: top.id,
      sentence: top.sentence,
      reading: top.reading,
      casual: top.casual,
      polite: top.polite,
      createdAt: Date.now(),
      savedAt: Date.now(),
    });
    setSavedCardIds((prev) => new Set(prev).add(top.id));
  }, [queue]);

  const toggleForm = useCallback(() => {
    setQueue((prev) => {
      const copy = [...prev];
      if (copy[0]) {
        copy[0] = {
          ...copy[0],
          displayForm: copy[0].displayForm === "casual" ? "polite" : "casual",
        };
      }
      return copy;
    });
  }, []);

  const isCurrentCardSaved = queue[0] != null && savedCardIds.has(queue[0].id);

  return (
    <CardQueueContext.Provider
      value={{ queue, loading, error, skip, save, saveToLibrary, isCurrentCardSaved, toggleForm, refillNewSet }}
    >
      {children}
    </CardQueueContext.Provider>
  );
}

export function useCardQueue(): CardQueueValue {
  const ctx = useContext(CardQueueContext);
  if (!ctx) throw new Error("useCardQueue must be used within CardQueueProvider");
  return ctx;
}
