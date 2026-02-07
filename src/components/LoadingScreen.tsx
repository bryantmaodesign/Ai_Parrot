"use client";

interface LoadingScreenProps {
  progress?: number; // 0-100
}

export function LoadingScreen({ progress = 0 }: LoadingScreenProps) {
  return (
    <div
      className="bg-loading-gradient fixed inset-0 z-[60] flex flex-col overflow-hidden"
      aria-label="Loading"
      role="status"
    >
      {/* Centered branding */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <span className="relative z-10 text-4xl font-semibold tracking-tight text-white drop-shadow-sm">
          ParrotAi
        </span>
      </div>
      {/* Bottom row: aligned with top of main bottom nav bar */}
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 py-4 pb-20 safe-area-pb">
        <p className="text-sm font-medium text-white/95 drop-shadow-sm">
          Preparing your shadowing cards
        </p>
        {/* Progress bar */}
        <div className="w-full max-w-xs">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full bg-white transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="mt-1 text-center text-xs text-white/80">
            {Math.round(progress)}%
          </p>
        </div>
      </div>
    </div>
  );
}
