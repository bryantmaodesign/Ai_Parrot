"use client";

import { useState, useEffect } from "react";

interface PauseCardProps {
  onStartNewRun: () => Promise<void>;
  loadingProgress: number;
}

export function PauseCard({ onStartNewRun, loadingProgress }: PauseCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Reset loading state when progress completes
  useEffect(() => {
    if (loadingProgress >= 100 && isLoading) {
      // Small delay to show 100% before resetting
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loadingProgress, isLoading]);

  const handleClick = async () => {
    setIsLoading(true);
    await onStartNewRun();
  };

  // Show progress bar when loading or when progress > 0
  const showProgressBar = isLoading || loadingProgress > 0;

  return (
    <div className="card-pop-in rounded-3xl bg-white p-6 flex min-h-0 flex-1 flex-col shadow-[0_4px_20px_rgba(0,0,0,0.08)] justify-center items-center text-center">
      <p className="mb-8 text-xl font-semibold text-[#1a1a1a]">
        You just finished 5 cards!
      </p>
      
      <div className="w-full max-w-xs transition-all duration-300">
        {showProgressBar ? (
          <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
            <div className="w-full h-2 overflow-hidden rounded-full bg-[#e0e0e0]">
              <div
                className="h-full bg-[#00e676] transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, loadingProgress))}%` }}
                role="progressbar"
                aria-valuenow={loadingProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className="text-sm text-[#9e9e9e]">
              {loadingProgress < 100 ? "Loading new cards..." : "Ready!"}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            className="inline-flex min-h-[3rem] min-w-[10rem] items-center justify-center gap-2 rounded-full bg-[#00e676] px-6 py-3 font-semibold text-white shadow-[0_2px_8px_rgba(0,230,118,0.4)] transition-all hover:opacity-95 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#00e676] focus:ring-offset-2"
          >
            Start another run
          </button>
        )}
      </div>
    </div>
  );
}
