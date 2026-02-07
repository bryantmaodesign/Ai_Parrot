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
import { db, type CachedSentence } from "@/lib/db";
import { useSettings, type JlptLevel } from "@/contexts/SettingsContext";
import staticSentencesData from "@/data/sentences.json";

const QUEUE_TARGET_SIZE = 5; // maintain 5 cards in queue
const REFILL_THRESHOLD = 2; // when 2 cards left, load more to maintain 5 cards
const STATIC_RATIO = 0.7; // 70% static, 30% AI-generated
const AI_CACHE_TARGET_SIZE = 20; // target AI-generated sentences per level in cache
const AI_CACHE_REFILL_THRESHOLD = 5; // refill AI cache when drops below this

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
  level?: JlptLevel;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Get static sentences from JSON file for a given level. */
function getStaticSentences(level: JlptLevel): Array<{
  sentence: string;
  reading?: string;
  casual?: string;
  polite?: string;
  translation?: string;
  furiganaPolite?: FuriganaSegment[];
  furiganaCasual?: FuriganaSegment[];
}> {
  const sentences = (staticSentencesData as Record<JlptLevel, typeof staticSentencesData.N5>)[level] || [];
  // Shuffle for variety
  return [...sentences].sort(() => Math.random() - 0.5);
}

/** Get AI-generated sentences from cache (IndexedDB) for a given level. */
async function getAICachedSentences(level: JlptLevel, count: number): Promise<CachedSentence[]> {
  const all = await db.sentenceCache.where("level").equals(level).toArray();
  const unused = all.filter((s) => s.usedAt == null).sort((a, b) => a.createdAt - b.createdAt);
  const used = all.filter((s) => s.usedAt != null).sort((a, b) => (a.usedAt ?? 0) - (b.usedAt ?? 0));
  const result = [...unused, ...used].slice(0, count);
  
  const now = Date.now();
  await Promise.all(result.map((s) => db.sentenceCache.update(s.id, { usedAt: now })));
  return result;
}

/** Add AI-generated sentences to cache (only for AI sentences, not static). */
async function addAIToCache(level: JlptLevel, sentences: Array<{
  sentence: string;
  reading?: string;
  casual?: string;
  polite?: string;
  translation?: string;
  furiganaPolite?: FuriganaSegment[];
  furiganaCasual?: FuriganaSegment[];
}>): Promise<void> {
  const now = Date.now();
  const toAdd: CachedSentence[] = sentences.map((s) => ({
    id: generateId(),
    level,
    sentence: s.sentence,
    reading: s.reading,
    casual: s.casual,
    polite: s.polite,
    translation: s.translation,
    furiganaPolite: s.furiganaPolite,
    furiganaCasual: s.furiganaCasual,
    createdAt: now,
    usedAt: undefined,
  }));

  const existing = await db.sentenceCache.where("level").equals(level).toArray();
  const existingSentences = new Set(existing.map((e) => e.sentence));
  const uniqueToAdd = toAdd.filter((s) => !existingSentences.has(s.sentence));

  if (uniqueToAdd.length > 0) {
    await db.sentenceCache.bulkAdd(uniqueToAdd).catch(() => {});
  }

  // LRU eviction: keep max 50 AI sentences per level
  const allForLevel = await db.sentenceCache.where("level").equals(level).toArray();
  if (allForLevel.length > 50) {
    const sorted = allForLevel.sort((a, b) => {
      const aTime = a.usedAt ?? a.createdAt;
      const bTime = b.usedAt ?? b.createdAt;
      return aTime - bTime;
    });
    const toDelete = sorted.slice(0, allForLevel.length - 50);
    await db.sentenceCache.bulkDelete(toDelete.map((s) => s.id));
  }
}

/** Get AI cache size for a level. */
async function getAICacheSize(level: JlptLevel): Promise<number> {
  return db.sentenceCache.where("level").equals(level).count();
}

/** Generate sentences via API. */
async function generateSentencesViaAPI(count: number, level: JlptLevel): Promise<Array<{
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
    throw new Error(res.status === 500 && msg.includes("API") ? "Server error: add OPENAI_API_KEY in .env.local" : msg);
  }
  return data.sentences ?? [];
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
  // Get static sentences (70%)
  const staticSentences = getStaticSentences(level);
  const staticCount = Math.floor(count * STATIC_RATIO);
  const aiCount = count - staticCount;
  
  const result: Array<{
    sentence: string;
    reading?: string;
    casual?: string;
    polite?: string;
    translation?: string;
    furiganaPolite?: FuriganaSegment[];
    furiganaCasual?: FuriganaSegment[];
  }> = [];

  // Add static sentences
  result.push(...staticSentences.slice(0, staticCount));

  // Check if user has vocabulary - if yes, use AI-generated sentences (30%)
  const vocab = await db.vocabulary.toArray();
  const hasVocabulary = vocab.length > 0;

  if (hasVocabulary && aiCount > 0) {
    // Try to get AI sentences from cache first
    const aiCached = await getAICachedSentences(level, aiCount);
    const aiFromCache = aiCached.map((s) => ({
      sentence: s.sentence,
      reading: s.reading,
      casual: s.casual,
      polite: s.polite,
      translation: s.translation,
      furiganaPolite: s.furiganaPolite,
      furiganaCasual: s.furiganaCasual,
    }));

    result.push(...aiFromCache);

    // If we need more AI sentences, generate them in background (don't block)
    if (aiFromCache.length < aiCount) {
      void generateSentencesViaAPI(aiCount - aiFromCache.length, level).then((generated) => {
        if (generated.length > 0) {
          void addAIToCache(level, generated);
        }
      });
    }
  } else if (!hasVocabulary && aiCount > 0) {
    // No vocabulary - fill remaining slots with more static sentences
    const moreStatic = staticSentences.slice(staticCount, staticCount + aiCount);
    result.push(...moreStatic);
  }

  // Shuffle the mix for variety, then return requested count
  return result.sort(() => Math.random() - 0.5).slice(0, count);
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
  speed: number = 1.0,
  level?: JlptLevel
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
    level,
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
  loadCardFromLibrary: (cardId: string) => Promise<void>;
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

  /** Load cards to maintain queue size (background). */
  const loadCardsToMaintainQueue = useCallback(async () => {
    if (refillingRef.current) return;
    refillingRef.current = true;
    const level = settings.jlptLevel;
    const speed = settings.speed;
    try {
      // Get current queue size from state
      setQueue((prev) => {
        const currentSize = prev.length;
        const needed = QUEUE_TARGET_SIZE - currentSize;
        if (needed <= 0) {
          refillingRef.current = false;
          return prev;
        }

        // Load cards asynchronously
        fetchSentences(needed, level)
          .then((sentences) => {
            if (sentences.length === 0) {
              refillingRef.current = false;
              return;
            }
            return Promise.all(
              sentences.map((s) => buildCard(s, speed, level).catch(() => null))
            );
          })
          .then((cards) => {
            if (!cards) {
              refillingRef.current = false;
              return;
            }
            const validCards = cards.filter((c): c is QueueCard => c !== null);
            if (validCards.length > 0) {
              setQueue((current) => [...current, ...validCards]);
            }
            refillingRef.current = false;
          })
          .catch((e) => {
            setError(e instanceof Error ? e.message : "Failed to load cards");
            refillingRef.current = false;
          });
        return prev;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cards");
      refillingRef.current = false;
    }
  }, [settings.jlptLevel, settings.speed]);

  const refillNewSet = useCallback(async () => {
    const level = settings.jlptLevel;
    const speed = settings.speed;
    setError(null);
    // Don't show loading screen if we already have cards - just load in background
    const hasExistingCards = queue.length > 0;
    if (!hasExistingCards) {
      setLoading(true);
    }
    // Load new cards first, then replace queue to avoid empty state
    // Keep existing cards visible while loading new ones
    try {
      const sentences = await fetchSentences(QUEUE_TARGET_SIZE, level);
      if (sentences.length === 0) {
        if (!hasExistingCards) setLoading(false);
        return;
      }
      const cards = await Promise.all(
        sentences.map((s) => buildCard(s, speed, level).catch(() => null))
      );
      const validCards = cards.filter((c): c is QueueCard => c !== null);
      if (validCards.length > 0) {
        // Replace queue with new cards - this will show them immediately
        // Old cards stay visible until new ones are ready
        setQueue(validCards);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cards");
    } finally {
      if (!hasExistingCards) {
        setLoading(false);
      }
    }
  }, [settings.jlptLevel, settings.speed, queue.length]);

  // Initial load: load 5 cards
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
        const sentences = await fetchSentences(QUEUE_TARGET_SIZE, level);
        if (cancelled) return;
        if (sentences.length === 0) {
          setLoading(false);
          return;
        }
        const cards = await Promise.all(
          sentences.map((s) => buildCard(s, speed, level).catch(() => null))
        );
        if (cancelled) return;
        window.clearTimeout(timeout);
        const validCards = cards.filter((c): c is QueueCard => c !== null);
        if (!cancelled && validCards.length > 0) {
          setQueue(validCards);
        } else if (!cancelled) {
          setError("Could not build cards. Try again.");
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
  }, [settings.jlptLevel, settings.speed]);

  // When queue drops below threshold, load more cards to maintain 5 cards
  useEffect(() => {
    if (queue.length > 0 && queue.length <= REFILL_THRESHOLD && !refillingRef.current) {
      void loadCardsToMaintainQueue();
    }
  }, [queue.length, loadCardsToMaintainQueue]);

  /** Generate AI sentences in background for a level (only if vocabulary exists). */
  const generateAISentencesInBackground = useCallback(async (level: JlptLevel) => {
    const vocab = await db.vocabulary.toArray();
    if (vocab.length === 0) return; // No vocabulary, skip AI generation

    const currentSize = await getAICacheSize(level);
    if (currentSize >= AI_CACHE_TARGET_SIZE) return;

    const needed = Math.min(AI_CACHE_TARGET_SIZE - currentSize, 3); // Generate up to 3 at a time
    
    for (let i = 0; i < needed; i++) {
      try {
        const generated = await generateSentencesViaAPI(1, level);
        if (generated.length > 0) {
          await addAIToCache(level, generated);
        }
        // Small delay between generations to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (e) {
        // Ignore errors in background generation
        break;
      }
    }
  }, []);

  // Background AI sentence generation: check on app load and continuously refill
  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;

    (async () => {
      const vocab = await db.vocabulary.toArray();
      if (vocab.length === 0) return; // No vocabulary, no AI generation needed

      const level = settings.jlptLevel;
      const size = await getAICacheSize(level);
      
      // If cache is low, generate more in background
      if (size < AI_CACHE_REFILL_THRESHOLD) {
        void generateAISentencesInBackground(level);
      }
    })();
  }, [settings.jlptLevel, generateAISentencesInBackground]);

  // Continuously refill AI cache when it's being used
  useEffect(() => {
    if (queue.length === 0) return;
    
    (async () => {
      const vocab = await db.vocabulary.toArray();
      if (vocab.length === 0) return;

      const level = settings.jlptLevel;
      const size = await getAICacheSize(level);
      
      // Continuously generate if cache is low
      if (size < AI_CACHE_REFILL_THRESHOLD) {
        void generateAISentencesInBackground(level);
      }
    })();
  }, [queue.length, settings.jlptLevel, generateAISentencesInBackground]);

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
      furiganaPolite: top.furiganaPolite,
      furiganaCasual: top.furiganaCasual,
      level: top.level ?? settings.jlptLevel,
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
  }, [queue, settings.jlptLevel]);

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
      furiganaPolite: top.furiganaPolite,
      furiganaCasual: top.furiganaCasual,
      level: top.level ?? settings.jlptLevel,
      createdAt: Date.now(),
      savedAt: Date.now(),
    });
    setSavedCardIds((prev) => new Set(prev).add(top.id));
  }, [queue, settings.jlptLevel]);

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

  /** Load a specific card from library and display it. */
  const loadCardFromLibrary = useCallback(async (cardId: string) => {
    // Mark as loaded so initial load doesn't run
    hasLoadedOnceRef.current = true;
    
    const savedCard = await db.savedCards.get(cardId);
    if (!savedCard) {
      setError("Card not found");
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);
    const speed = settings.speed;

    try {
      // Convert SavedCard to QueueCard format
      const [casualBlob, politeBlob] = await Promise.all([
        fetchTTS(savedCard.casual, speed).catch(() => null),
        fetchTTS(savedCard.polite, speed).catch(() => null),
      ]);

      const queueCard: QueueCard = {
        id: savedCard.id,
        sentence: savedCard.sentence,
        reading: savedCard.reading,
        casual: savedCard.casual,
        polite: savedCard.polite,
        translation: undefined,
        displayForm: "casual",
        casualAudioUrl: casualBlob ? URL.createObjectURL(casualBlob) : null,
        politeAudioUrl: politeBlob ? URL.createObjectURL(politeBlob) : null,
        furiganaPolite: savedCard.furiganaPolite,
        furiganaCasual: savedCard.furiganaCasual,
        level: savedCard.level,
      };

      setQueue([queueCard]);
      // Prepare next card in background
      void loadCardsToMaintainQueue();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load card");
    } finally {
      setLoading(false);
    }
  }, [settings.speed, loadCardsToMaintainQueue]);

  return (
    <CardQueueContext.Provider
      value={{ queue, loading, error, skip, save, saveToLibrary, isCurrentCardSaved, toggleForm, refillNewSet, loadCardFromLibrary }}
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
