import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, MicOff } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionAny = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface AudioRecorderProps {
  /** Called with transcript text — may fire multiple times (live updates) */
  onTranscript: (text: string) => void;
  /** Called when final transcript is ready (recording stopped) */
  onFinal?: (text: string) => void;
  /** OpenAI key — only needed if mode is "whisper" */
  apiKey?: string;
  /** "browser" uses free Web Speech API (live), "whisper" uses OpenAI (batch) */
  mode?: "browser" | "whisper";
  /** Extra context to help Whisper with jargon */
  whisperContext?: string;
  disabled?: boolean;
}

// Check for browser speech recognition support
function getSpeechRecognition(): SpeechRecognitionAny | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionAny | null;
}

export function AudioRecorder({
  onTranscript,
  onFinal,
  apiKey,
  mode = "browser",
  whisperContext,
  disabled,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [liveText, setLiveText] = useState("");

  // Browser speech recognition refs
  const recognitionRef = useRef<SpeechRecognitionAny | null>(null);
  const fullTranscriptRef = useRef("");

  // Whisper refs
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      recognitionRef.current?.abort();
      recorderRef.current?.stop();
    };
  }, [stopTimer]);

  const supportsBrowserSpeech = typeof window !== "undefined" && getSpeechRecognition() !== null;
  const effectiveMode = mode === "browser" && supportsBrowserSpeech ? "browser" : "whisper";

  // --- Browser Speech API ---
  function startBrowserRecording() {
    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) return;

    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    fullTranscriptRef.current = "";
    setLiveText("");

    recognition.onresult = (event: { results: { length: number; [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } } }) => {
      let interim = "";
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      fullTranscriptRef.current = finalText;
      setLiveText(finalText + interim);
      // Live update as user speaks
      onTranscript(finalText + interim);
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error !== "aborted") {
        console.error("Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      // Speech recognition auto-stops sometimes — restart if still recording
      if (isRecording && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // already running
        }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }

  function stopBrowserRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
    stopTimer();
    const final = fullTranscriptRef.current || liveText;
    if (final.trim()) {
      onFinal?.(final.trim());
    }
    setLiveText("");
  }

  // --- Whisper (OpenAI) ---
  async function startWhisperRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeWithWhisper(blob);
      };

      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      alert("Microphone access denied");
    }
  }

  function stopWhisperRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
    stopTimer();
  }

  async function transcribeWithWhisper(blob: Blob) {
    if (!apiKey) {
      alert("An OpenAI API key is required for Whisper transcription. Switch to browser mode or set your key in Settings.");
      return;
    }
    setIsTranscribing(true);
    try {
      // TODO: Phase 4 — replace with api.ai.transcribeAudio()
      // For now, just pass through the blob info
      void blob;
      void whisperContext;
      alert("Whisper transcription will be available in Phase 4. Use browser mode for now.");
    } catch (err) {
      console.error("Transcription failed:", err);
    } finally {
      setIsTranscribing(false);
    }
  }

  // --- Unified handlers ---
  function startRecording() {
    if (effectiveMode === "browser") {
      startBrowserRecording();
    } else {
      startWhisperRecording();
    }
  }

  function stopRecording() {
    if (effectiveMode === "browser") {
      stopBrowserRecording();
    } else {
      stopWhisperRecording();
    }
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // --- Render ---
  if (isTranscribing) {
    return (
      <Button variant="outline" size="icon" disabled className="shrink-0">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (isRecording) {
    return (
      <Button
        variant="destructive"
        size="icon"
        onClick={stopRecording}
        className="shrink-0 relative"
        title={`Recording ${formatTime(duration)} — click to stop`}
      >
        <MicOff className="h-4 w-4" />
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-md animate-ping bg-red-500/30 pointer-events-none" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={startRecording}
      disabled={disabled}
      className="shrink-0"
      title={
        effectiveMode === "browser"
          ? "Record with browser speech recognition (free)"
          : "Record with Whisper (requires OpenAI key)"
      }
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}
