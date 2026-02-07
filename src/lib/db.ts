import Dexie, { type Table } from "dexie";

export interface VocabularyItem {
  id: string;
  word: string;
  reading?: string;
  createdAt: number;
}

export interface CardData {
  id: string;
  sentence: string;
  reading?: string;
  casual: string;
  polite: string;
  casualAudioUrl?: string;
  politeAudioUrl?: string;
  vocabularyIds?: string[];
  createdAt: number;
  furiganaPolite?: FuriganaSegment[];
  furiganaCasual?: FuriganaSegment[];
  level?: "N5" | "N4" | "N3" | "N2" | "N1";
}

export interface SavedCard extends CardData {
  savedAt: number;
}

export interface PracticeAttempt {
  id: string;
  cardId: string;
  score: number;
  feedbackText: string;
  createdAt: number;
}

export interface FuriganaSegment {
  text: string;
  reading?: string;
}

export interface CachedSentence {
  id: string;
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  sentence: string;
  reading?: string;
  casual?: string;
  polite?: string;
  translation?: string;
  furiganaPolite?: FuriganaSegment[];
  furiganaCasual?: FuriganaSegment[];
  createdAt: number;
  usedAt?: number; // Track last usage for LRU eviction
}

export class ShadowingDB extends Dexie {
  vocabulary!: Table<VocabularyItem, string>;
  savedCards!: Table<SavedCard, string>;
  practiceAttempts!: Table<PracticeAttempt, string>;
  sentenceCache!: Table<CachedSentence, string>;

  constructor() {
    super("ShadowingDB");
    this.version(1).stores({
      vocabulary: "id, word, createdAt",
      savedCards: "id, savedAt",
      practiceAttempts: "id, cardId, createdAt",
    });
    this.version(2).stores({
      vocabulary: "id, word, createdAt",
      savedCards: "id, savedAt",
      practiceAttempts: "id, cardId, createdAt",
      sentenceCache: "id, level, createdAt, usedAt",
    });
  }
}

export const db = new ShadowingDB();
