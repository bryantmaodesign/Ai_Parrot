"use client";

import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-lg rounded-2xl bg-[#1a1a1a] text-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex items-center justify-between gap-3"
    >
      <p className="text-sm font-medium">Install the app for a better experience.</p>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={handleInstall}
          className="shrink-0 min-h-[2.5rem] inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#fe3c72] text-white text-sm font-semibold hover:bg-[#e63568] focus:outline-none focus:ring-2 focus:ring-white"
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 min-h-[2.5rem] inline-flex items-center justify-center px-4 py-2 rounded-full border-2 border-[#555] text-sm font-medium hover:bg-[#333] focus:outline-none focus:ring-2 focus:ring-[#555]"
          aria-label="Dismiss install prompt"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
