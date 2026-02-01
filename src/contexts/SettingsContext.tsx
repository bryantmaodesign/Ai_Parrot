"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "shadowing-settings";

export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export interface SettingsState {
  jlptLevel: JlptLevel;
  speed: number;
}

const DEFAULT_SETTINGS: SettingsState = {
  jlptLevel: "N5",
  speed: 1.0,
};

function loadSettings(): SettingsState {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    const jlptLevel =
      parsed.jlptLevel && ["N5", "N4", "N3", "N2", "N1"].includes(parsed.jlptLevel)
        ? (parsed.jlptLevel as JlptLevel)
        : DEFAULT_SETTINGS.jlptLevel;
    const speed =
      typeof parsed.speed === "number" && parsed.speed >= 0.8 && parsed.speed <= 1.2
        ? Math.round(parsed.speed * 10) / 10
        : DEFAULT_SETTINGS.speed;
    return { jlptLevel, speed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

type SettingsValue = {
  settings: SettingsState;
  setJlptLevel: (level: JlptLevel) => void;
  setSpeed: (speed: number) => void;
  saveSettings: () => void;
  isSheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
};

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const setJlptLevel = useCallback((jlptLevel: JlptLevel) => {
    setSettings((prev) => ({ ...prev, jlptLevel }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    const clamped = Math.min(1.2, Math.max(0.8, Math.round(speed * 10) / 10));
    setSettings((prev) => ({ ...prev, speed: clamped }));
  }, []);

  const saveSettings = useCallback(() => {
    setSettings((prev) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
      } catch {
        // ignore
      }
      return prev;
    });
  }, []);

  const openSheet = useCallback(() => setIsSheetOpen(true), []);
  const closeSheet = useCallback(() => setIsSheetOpen(false), []);

  return (
    <SettingsContext.Provider
      value={{ settings, setJlptLevel, setSpeed, saveSettings, isSheetOpen, openSheet, closeSheet }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
