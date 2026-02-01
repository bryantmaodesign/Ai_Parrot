"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings, type JlptLevel } from "@/contexts/SettingsContext";
import { useCardQueue } from "@/hooks/useCardQueue";

const JLPT_LEVELS: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];
const SPEED_MIN = 0.8;
const SPEED_MAX = 1.2;
const SPEED_STEP = 0.1;

function levelToIndex(level: JlptLevel): number {
  const i = JLPT_LEVELS.indexOf(level);
  return i >= 0 ? i : 0;
}

function indexToLevel(index: number): JlptLevel {
  const i = Math.max(0, Math.min(4, Math.round(index)));
  return JLPT_LEVELS[i];
}

export function SettingsSheet() {
  const { settings, setJlptLevel, setSpeed, saveSettings, isSheetOpen, closeSheet } = useSettings();
  const { refillNewSet } = useCardQueue();
  const [isExiting, setIsExiting] = useState(false);
  const closeOnAnimationEndRef = useRef(false);

  useEffect(() => {
    if (isSheetOpen) {
      setIsExiting(false);
      closeOnAnimationEndRef.current = false;
    }
  }, [isSheetOpen]);

  const handleAnimationEnd = (e: React.AnimationEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.animationName === "settings-sheet-out" && closeOnAnimationEndRef.current) {
      closeOnAnimationEndRef.current = false;
      closeSheet();
    }
  };

  const startClose = () => {
    closeOnAnimationEndRef.current = true;
    setIsExiting(true);
  };

  const handleBackdropClick = () => {
    startClose();
  };

  const handleSave = () => {
    saveSettings();
    void refillNewSet();
    startClose();
  };

  if (!isSheetOpen) return null;

  const levelIndex = levelToIndex(settings.jlptLevel);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      {/* Backdrop */}
      <button
        type="button"
        className={`settings-backdrop absolute inset-0 bg-black/50 ${isExiting ? "settings-backdrop-animate-out" : "settings-backdrop-animate-in"}`}
        onClick={handleBackdropClick}
        aria-label="Close settings"
      />
      {/* Bottom sheet */}
      <div
        className={`settings-sheet-panel relative z-10 flex max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.12)] ${isExiting ? "settings-sheet-animate-out" : "settings-sheet-animate-in"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onAnimationEnd={handleAnimationEnd}
      >
          <div className="flex shrink-0 items-center justify-center border-b border-[#eee] py-3">
          <div className="h-1 w-10 rounded-full bg-[#ddd]" aria-hidden />
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-8 pt-2">
          <h1 id="settings-title" className="sr-only">
            Settings
          </h1>

          {/* Difficulty: label on top, then slider, then range labels below */}
          <div className="mb-8">
            <div className="mb-2 flex items-baseline justify-between text-sm text-[#424242]">
              <span className="font-semibold text-[#1a1a1a]">Difficulty</span>
              <span className="font-medium">{settings.jlptLevel}</span>
            </div>
            <div className="relative w-full h-8 flex items-center">
              {/* Track with 3 scale marks (no first/last), subtle, sticking out */}
              <div className="absolute left-0 right-0 h-2 rounded-full bg-[#e0e0e0]" aria-hidden>
                <span className="absolute left-1/4 top-1/2 w-0.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c4c4c4]/80" />
                <span className="absolute left-1/2 top-1/2 w-0.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c4c4c4]/80" />
                <span className="absolute left-3/4 top-1/2 w-0.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c4c4c4]/80" />
              </div>
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={levelIndex}
                onChange={(e) => setJlptLevel(indexToLevel(Number(e.target.value)))}
                className="relative z-10 h-6 w-full appearance-none rounded-full bg-transparent [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:block [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#fe3c72] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:mt-2 [&::-webkit-slider-runnable-track]:mb-2"
                aria-valuemin={0}
                aria-valuemax={4}
                aria-valuenow={levelIndex}
                aria-valuetext={settings.jlptLevel}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs text-[#9e9e9e]">
              <span>N5</span>
              <span>N1</span>
            </div>
          </div>

          {/* Speed: label on top, then slider, then range labels below */}
          <div className="mb-8">
            <div className="mb-2 flex items-baseline justify-between text-sm text-[#424242]">
              <span className="font-semibold text-[#1a1a1a]">Speed</span>
              <span className="font-medium">{settings.speed.toFixed(1)}×</span>
            </div>
            <div className="relative w-full h-8 flex items-center">
              {/* Track with 3 scale marks (no first/last), subtle, sticking out */}
              <div className="absolute left-0 right-0 h-2 rounded-full bg-[#e0e0e0]" aria-hidden>
                <span className="absolute left-1/4 top-1/2 w-0.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c4c4c4]/80" />
                <span className="absolute left-1/2 top-1/2 w-0.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c4c4c4]/80" />
                <span className="absolute left-3/4 top-1/2 w-0.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c4c4c4]/80" />
              </div>
              <input
                type="range"
                min={SPEED_MIN}
                max={SPEED_MAX}
                step={SPEED_STEP}
                value={settings.speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="relative z-10 h-6 w-full appearance-none rounded-full bg-transparent [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:block [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#fe3c72] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:mt-2 [&::-webkit-slider-runnable-track]:mb-2"
                aria-valuemin={SPEED_MIN}
                aria-valuemax={SPEED_MAX}
                aria-valuenow={settings.speed}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs text-[#9e9e9e]">
              <span>0.8×</span>
              <span>1.2×</span>
            </div>
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-full bg-[#fe3c72] py-3.5 font-semibold text-white shadow-[0_2px_12px_rgba(254,60,114,0.4)] transition-opacity hover:opacity-95 active:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
