"use client";

import { useState, useRef, useCallback } from "react";

export type RecorderState = "idle" | "recording" | "stopped";

export interface UseMediaRecorderReturn {
  state: RecorderState;
  audioBlob: Blob | null;
  durationSecs: number;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  error: string | null;
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const [state, setState] = useState<RecorderState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [durationSecs, setDurationSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setDurationSecs(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Pick best supported format (webm/opus for Chrome, mp4 for Safari)
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        setAudioBlob(blob);
        setState("stopped");
        // Stop all microphone tracks
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250); // collect chunks every 250ms
      setState("recording");

      // Duration counter
      timerRef.current = setInterval(() => {
        setDurationSecs((s) => s + 1);
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Microphone access denied";
      setError(msg);
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setAudioBlob(null);
    setDurationSecs(0);
    setError(null);
    setState("idle");
    chunksRef.current = [];
  }, [stop]);

  return { state, audioBlob, durationSecs, start, stop, reset, error };
}
