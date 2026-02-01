"use client";

import { useSettings } from "@/contexts/SettingsContext";

export function SettingsButton() {
  const { openSheet } = useSettings();

  return (
    <button
      type="button"
      onClick={openSheet}
      className="fixed top-0 right-0 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#424242] shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-colors hover:bg-white hover:text-[#1a1a1a] mr-2.5 mb-2.5"
      style={{ marginTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
      aria-label="Settings"
    >
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.04.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
      </svg>
    </button>
  );
}
