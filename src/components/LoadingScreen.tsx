"use client";

export function LoadingScreen() {
  return (
    <div
      className="bg-loading-gradient fixed inset-0 z-[60] flex flex-col overflow-hidden"
      aria-label="Loading"
      role="status"
    >
      {/* Centered branding */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <span className="relative z-10 text-4xl font-semibold tracking-tight text-white drop-shadow-sm">
          parrot
        </span>
      </div>
      {/* Bottom row: aligned with top of main bottom nav bar */}
      <div className="relative z-10 flex items-center justify-center gap-3 px-6 py-4 pb-20 safe-area-pb">
        <div
          className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
          aria-hidden
        />
        <p className="text-sm font-medium text-white/95 drop-shadow-sm">
          Preparing your shadowing cards
        </p>
      </div>
    </div>
  );
}
