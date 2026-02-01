"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type RecordingContextValue = {
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  registerHandlers: (start: (() => void) | null, stop: (() => void) | null) => void;
  setRecording: (recording: boolean) => void;
};

const RecordingContext = createContext<RecordingContextValue | null>(null);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const [isRecording, setRecording] = useState(false);
  const startRef = useRef<(() => void) | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const registerHandlers = useCallback(
    (start: (() => void) | null, stop: (() => void) | null) => {
      startRef.current = start;
      stopRef.current = stop;
    },
    []
  );

  const startRecording = useCallback(() => {
    startRef.current?.();
  }, []);

  const stopRecording = useCallback(() => {
    stopRef.current?.();
  }, []);

  return (
    <RecordingContext.Provider
      value={{
        isRecording,
        startRecording,
        stopRecording,
        registerHandlers,
        setRecording,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error("useRecording must be used within RecordingProvider");
  return ctx;
}
