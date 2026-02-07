"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { db, type SavedCard, type VocabularyItem } from "@/lib/db";
import { useSettings } from "@/contexts/SettingsContext";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type LibraryTab = "saved" | "vocabulary";

function LibraryContent() {
  const { settings } = useSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<LibraryTab>(
    tabParam === "vocabulary" ? "vocabulary" : "saved"
  );

  // Sync tab from URL (e.g. /library?tab=vocabulary)
  useEffect(() => {
    setTab(tabParam === "vocabulary" ? "vocabulary" : "saved");
  }, [tabParam]);

  // --- Saved cards state ---
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    const list = await db.savedCards.orderBy("savedAt").reverse().toArray();
    setCards(list);
  }, []);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);


  const handleCardClick = useCallback((cardId: string) => {
    router.push(`/?cardId=${encodeURIComponent(cardId)}`);
  }, [router]);

  // --- Vocabulary state ---
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [word, setWord] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState("");
  const [editReading, setEditReading] = useState("");
  
  // --- Camera/OCR state ---
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const loadItems = useCallback(async () => {
    const list = await db.vocabulary.orderBy("createdAt").reverse().toArray();
    setItems(list);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = word.trim();
    if (!trimmed) return;
    await db.vocabulary.add({
      id: generateId(),
      word: trimmed,
      reading: undefined,
      createdAt: Date.now(),
    });
    setWord("");
    void loadItems();
  };

  const handleDelete = async (id: string) => {
    await db.vocabulary.delete(id);
    if (editingId === id) setEditingId(null);
    void loadItems();
  };

  const startEdit = (item: VocabularyItem) => {
    setEditingId(item.id);
    setEditWord(item.word);
    setEditReading(item.reading ?? "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const trimmed = editWord.trim();
    if (!trimmed) return;
    await db.vocabulary.update(editingId, {
      word: trimmed,
      reading: editReading.trim() || undefined,
    });
    setEditingId(null);
    setEditWord("");
    setEditReading("");
    void loadItems();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditWord("");
    setEditReading("");
  };

  // --- Camera/OCR handlers ---
  const handleCameraClick = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    if (imageInputRef.current) imageInputRef.current.value = "";

    setIsProcessingImage(true);
    setOcrError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/ocr-translate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "OCR/Translation failed");
      }

      const data = await res.json();
      if (data.text && data.text.trim()) {
        setWord(data.text.trim());
      } else {
        setOcrError("No text found in image.");
      }
    } catch (e) {
      console.error("OCR/Translation error:", e);
      setOcrError(e instanceof Error ? e.message : "Failed to process image. Please try again.");
    } finally {
      setIsProcessingImage(false);
    }
  }, []);

  return (
    <div className="bg-white flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-[#1a1a1a]">Library</h1>

      <div
        className="flex rounded-full bg-[#f5f5f5] p-1 mt-4 mb-6"
        role="tablist"
        aria-label="Saved cards or Vocabulary"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "saved"}
          onClick={() => setTab("saved")}
          className={`flex-1 min-h-[2.75rem] inline-flex items-center justify-center py-2.5 text-sm font-semibold rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[#1da1f2] focus:ring-offset-2 ${
            tab === "saved"
              ? "bg-white text-[#1a1a1a] shadow-sm"
              : "bg-transparent text-[#9e9e9e]"
          }`}
        >
          Saved
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "vocabulary"}
          onClick={() => setTab("vocabulary")}
          className={`flex-1 min-h-[2.75rem] inline-flex items-center justify-center py-2.5 text-sm font-semibold rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[#1da1f2] focus:ring-offset-2 ${
            tab === "vocabulary"
              ? "bg-white text-[#1a1a1a] shadow-sm"
              : "bg-transparent text-[#9e9e9e]"
          }`}
        >
          Vocabulary
        </button>
      </div>

      {tab === "saved" && (
        <>
          <p className="text-sm text-[#424242] mb-6">
            Your saved cards. Tap a card to view it on the home page.
          </p>
          {cards.length === 0 ? (
            <p className="text-[#9e9e9e] text-sm">
              No saved cards yet. Swipe right on a card on the home stack to save it.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-4">
              {cards.map((card) => (
                <li
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  className="relative rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)] cursor-pointer hover:shadow-[0_6px_24px_rgba(0,0,0,0.12)] transition-shadow"
                >
                  {card.level && (
                    <span className="inline-block mb-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-[#e8f4fd] text-[#1da1f2]">
                      {card.level}
                    </span>
                  )}
                  <p className="text-base font-semibold text-[#1a1a1a] mb-1 [ruby-align:center] line-clamp-3" lang="ja">
                    {card.furiganaPolite && card.furiganaPolite.length > 0 ? (
                      card.furiganaPolite.map((seg, i) =>
                        seg.reading ? (
                          <ruby key={i}>
                            {seg.text}
                            <rt className="text-xs text-[#9e9e9e]">{seg.reading}</rt>
                          </ruby>
                        ) : (
                          <span key={i}>{seg.text}</span>
                        )
                      )
                    ) : (
                      card.polite
                    )}
                  </p>
                  {card.reading && (
                    <p className="text-xs text-[#9e9e9e] line-clamp-1" lang="ja">
                      {card.reading}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "vocabulary" && (
        <>
          <p className="text-sm text-[#424242] mb-6">
            Add words by text. The AI will use these when generating shadowing sentences.
          </p>

          <form onSubmit={handleAdd} className="flex flex-col gap-3 mb-8">
            <label htmlFor="word" className="sr-only">
              Word
            </label>
            <div className="relative">
              <input
                id="word"
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Word (e.g. 今日)"
                className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-[#e0e0e0] bg-white text-[#1a1a1a] placeholder-[#9e9e9e] focus:outline-none focus:ring-2 focus:ring-[#1da1f2] focus:border-transparent"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={handleCameraClick}
                disabled={isProcessingImage}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#1da1f2] ${
                  isProcessingImage
                    ? "bg-[#e0e0e0] text-[#9e9e9e] cursor-not-allowed"
                    : "bg-[#f5f5f5] text-[#424242] hover:bg-[#e0e0e0]"
                }`}
                aria-label="Take photo or upload image"
              >
                {isProcessingImage ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-spin"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                )}
              </button>
              {/* Hidden file input for camera/file selection */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageCapture}
                className="hidden"
                aria-hidden="true"
              />
            </div>
            {ocrError && (
              <p className="text-sm text-[#fe3c72] -mt-2">{ocrError}</p>
            )}
            {isProcessingImage && (
              <p className="text-sm text-[#1da1f2] -mt-2">Processing image...</p>
            )}
            <button
              type="submit"
              className="min-h-[3rem] inline-flex items-center justify-center px-4 py-3 rounded-full bg-[#00e676] text-white font-semibold hover:bg-[#00d66b] focus:outline-none focus:ring-2 focus:ring-[#00e676] focus:ring-offset-2 shadow-[0_2px_12px_rgba(0,230,118,0.35)]"
            >
              Add word
            </button>
          </form>

          <section aria-label="Your words">
            <h2 className="text-sm font-semibold text-[#424242] mb-3">Your words ({items.length})</h2>
            {items.length === 0 ? (
              <p className="text-[#9e9e9e] text-sm">
                No words yet. Add words above to get personalized sentences.
              </p>
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 py-3 px-4 rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                  >
                    {editingId === item.id ? (
                      <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          value={editWord}
                          onChange={(e) => setEditWord(e.target.value)}
                          className="flex-1 min-w-0 px-3 py-2 rounded-lg border-2 border-[#e0e0e0] text-[#1a1a1a] focus:ring-2 focus:ring-[#1da1f2]"
                          autoFocus
                          aria-label="Edit word"
                        />
                        <input
                          type="text"
                          value={editReading}
                          onChange={(e) => setEditReading(e.target.value)}
                          placeholder="Reading"
                          className="flex-1 min-w-0 px-3 py-2 rounded-lg border-2 border-[#e0e0e0] text-[#1a1a1a] focus:ring-2 focus:ring-[#1da1f2]"
                          aria-label="Edit reading"
                        />
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="submit"
                            className="shrink-0 min-h-[2.5rem] inline-flex items-center justify-center px-3 py-2 rounded-full bg-[#00e676] text-white text-sm font-semibold hover:bg-[#00d66b]"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="shrink-0 min-h-[2.5rem] inline-flex items-center justify-center px-3 py-2 rounded-full border-2 border-[#e0e0e0] text-[#424242] text-sm font-medium hover:bg-[#f5f5f5]"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-[#1a1a1a]">{item.word}</span>
                          {item.reading && (
                            <span className="ml-2 text-[#9e9e9e] text-sm">({item.reading})</span>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="shrink-0 min-h-[2.25rem] inline-flex items-center justify-center px-3 py-1.5 rounded-full text-sm font-medium text-[#1da1f2] hover:bg-[#e8f4fd] focus:outline-none focus:ring-2 focus:ring-[#1da1f2]"
                            aria-label={`Edit ${item.word}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="shrink-0 min-h-[2.25rem] inline-flex items-center justify-center px-3 py-1.5 rounded-full text-sm font-medium text-[#fe3c72] hover:bg-[#fff0f4] focus:outline-none focus:ring-2 focus:ring-[#fe3c72]"
                            aria-label={`Delete ${item.word}`}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[#9e9e9e] font-medium text-center">Loading…</div>}>
      <LibraryContent />
    </Suspense>
  );
}
