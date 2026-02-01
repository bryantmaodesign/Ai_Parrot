"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCardQueue } from "@/hooks/useCardQueue";
import { CardStack } from "@/components/CardStack";
import { LoadingScreen } from "@/components/LoadingScreen";

function StackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const triggerRecord = searchParams.get("record") === "1";
  const { queue, loading, error, skip, save, toggleForm, refillNewSet } = useCardQueue();
  const currentCard = queue[0] ?? null;
  const stackCards = queue.slice(0, 3);
  const [toastVisible, setToastVisible] = useState(false);
  const [refilling, setRefilling] = useState(false);

  useEffect(() => {
    if (triggerRecord) {
      router.replace("/", { scroll: false });
    }
  }, [triggerRecord, router]);

  useEffect(() => {
    if (!toastVisible) return;
    const t = setTimeout(() => setToastVisible(false), 2500);
    return () => clearTimeout(t);
  }, [toastVisible]);

  if (loading && queue.length === 0) {
    return <LoadingScreen />;
  }

  if (error && queue.length === 0) {
    return (
      <div className="bg-loading-gradient flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden p-6">
        <p className="mb-2 font-medium text-white drop-shadow-sm">{error}</p>
        <p className="text-sm text-white/90">Check your connection and API key (backend).</p>
      </div>
    );
  }

  if (!currentCard) {
    const handleOneMoreRun = async () => {
      setRefilling(true);
      try {
        await refillNewSet();
      } finally {
        setRefilling(false);
      }
    };
    return (
      <div
        className="bg-loading-gradient flex min-h-0 flex-1 flex-col overflow-hidden pt-4 pb-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
      >
        <div className="mx-5 flex min-h-0 flex-1 flex-col">
          <div className="rounded-3xl bg-white p-6 flex flex-1 min-h-0 flex-col shadow-[0_4px_20px_rgba(0,0,0,0.08)] justify-center text-center">
            <p className="mb-6 text-lg font-semibold text-[#1a1a1a]">
              Great! You just finished the practice of the day!!
            </p>
            <button
              type="button"
              onClick={handleOneMoreRun}
              disabled={refilling}
              className="inline-flex min-h-[3rem] min-w-[10rem] items-center justify-center gap-2 rounded-full bg-[#00e676] px-6 py-3 font-semibold text-white shadow-[0_2px_8px_rgba(0,230,118,0.4)] transition-opacity hover:opacity-95 disabled:opacity-70"
            >
              {refilling ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                  <span>Loading…</span>
                </>
              ) : (
                "One more run"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-loading-gradient relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex min-h-0 flex-1 flex-col pt-4 pb-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
      >
        <h1 className="sr-only">Card stack</h1>
        <CardStack
          cards={stackCards}
          onSkip={skip}
          onSave={save}
          onToggleForm={toggleForm}
          onSaved={() => setToastVisible(true)}
          triggerRecord={triggerRecord}
        />
      </div>
      {toastVisible && (
        <div className="fixed bottom-24 left-0 right-0 z-[55] flex justify-center px-4">
          <div
            className="toast-slide-up w-fit rounded-full bg-[#1a1a1a] px-3 py-2 text-xs font-medium text-white shadow-md"
            role="status"
            aria-live="polite"
          >
            Saved to library
          </div>
        </div>
      )}
    </div>
  );
}

export default function StackPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <StackContent />
    </Suspense>
  );
}
