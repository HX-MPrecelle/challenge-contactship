"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The Web Speech API isn't in lib.dom yet under a stable name, so we declare
// the minimal shape we need. Chrome/Edge expose `webkitSpeechRecognition`
// and Safari exposes `SpeechRecognition` — both share this surface.
type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>> & {
    [k: number]: { isFinal?: boolean; [n: number]: { transcript: string } };
  };
  resultIndex: number;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type UseVoiceInputResult = {
  supported: boolean;
  listening: boolean;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
};

/**
 * Wrap the Web Speech API with React-friendly lifecycle.
 *
 * Calls `onFinalTranscript` once the user stops talking (or hits stop), with
 * the full final transcript. `interim` is the live preview the UI can render
 * underneath the input while the user is speaking — it's mutated word by
 * word so we keep it in state, not in a ref.
 *
 * Gracefully no-ops on browsers without SpeechRecognition; the consumer
 * should check `supported` and hide the mic button if false.
 */
export function useVoiceInput(
  onFinalTranscript: (transcript: string) => void,
  options?: { lang?: string }
): UseVoiceInputResult {
  const lang = options?.lang ?? "es-AR";
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onFinalRef = useRef(onFinalTranscript);

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Tu navegador no soporta reconocimiento de voz");
      return;
    }
    if (recognitionRef.current) return;

    setError(null);
    setInterim("");

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;

    let finalTranscript = "";

    rec.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (!res) continue;
        const transcript = res[0]?.transcript ?? "";
        if (res.isFinal) {
          finalTranscript += transcript;
        } else {
          interimText += transcript;
        }
      }
      setInterim(interimText);
    };

    rec.onerror = (event) => {
      // "no-speech" and "aborted" are common UX-level events, not real errors.
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(`Reconocimiento falló: ${event.error}`);
      }
    };

    rec.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      const trimmed = finalTranscript.trim();
      setInterim("");
      if (trimmed.length > 0) {
        onFinalRef.current(trimmed);
      }
    };

    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch (err) {
      console.error("[useVoiceInput] start failed", err);
      recognitionRef.current = null;
      setListening(false);
      setError("No pudimos iniciar el micrófono");
    }
  }, [lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // Cleanup when the consumer unmounts mid-listening.
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  return { supported, listening, interim, error, start, stop };
}
