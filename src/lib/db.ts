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

export class ShadowingDB extends Dexie {
  vocabulary!: Table<VocabularyItem, string>;
  savedCards!: Table<SavedCard, string>;
  practiceAttempts!: Table<PracticeAttempt, string>;

  constructor() {
    super("ShadowingDB");
    this.version(1).stores({
      vocabulary: "id, word, createdAt",
      savedCards: "id, savedAt",
      practiceAttempts: "id, cardId, createdAt",
    });
  }
}

export const db = new ShadowingDB();
