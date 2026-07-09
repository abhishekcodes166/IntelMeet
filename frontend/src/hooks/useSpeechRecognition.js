import { useEffect, useRef } from "react";

/**
 * Continuous browser speech recognition with safe restarts.
 * The old version called recognition.start() from onend without
 * guards, which throws InvalidStateError and killed transcription.
 */
export default function useSpeechRecognition({ onTranscript, enabled }) {
  const recognitionRef = useRef(null);
  const enabledRef = useRef(enabled);
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    enabledRef.current = enabled;
    onTranscriptRef.current = onTranscript;
  });

  useEffect(() => {
    if (!enabled) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let stopped = false;
    let restartTimer = null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const transcript = result[0].transcript.trim();
          if (transcript) {
            onTranscriptRef.current?.(transcript, true);
          }
        }
      }
    };

    recognition.onerror = (event) => {
      // "no-speech" and "aborted" are routine; recognition restarts via onend
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        stopped = true;
      }
    };

    recognition.onend = () => {
      if (stopped || !enabledRef.current) return;
      // Debounced restart — an immediate start() can throw
      restartTimer = setTimeout(() => {
        try {
          recognition.start();
        } catch {
          /* already started */
        }
      }, 250);
    };

    try {
      recognition.start();
    } catch {
      /* already started */
    }
    recognitionRef.current = recognition;

    return () => {
      stopped = true;
      if (restartTimer) clearTimeout(restartTimer);
      try {
        recognition.stop();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    };
  }, [enabled]);
}
