import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, MicOff } from "lucide-react";
import { api } from "@/lib/api";

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

  // In Electron, Web Speech API exists but doesn't work (needs Google server).
  // Always use Whisper in desktop.
  const effectiveMode = "whisper" as const;
  void mode; // prop kept for API compat

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

  // --- Whisper with chunked transcription ---
  const streamRef = useRef<MediaStream | null>(null);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const allChunksRef = useRef<Blob[]>([]);

  async function startWhisperRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      allChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          allChunksRef.current.push(e.data);
        }
      };

      // Request data every 1s so chunks accumulate
      recorder.start(1000);
      recorderRef.current = recorder;
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);

      // Send accumulated audio to Whisper every 5 seconds
      chunkIntervalRef.current = setInterval(async () => {
        if (chunksRef.current.length === 0) return;
        const blob = new Blob([...allChunksRef.current], { type: mimeType });
        try {
          const buf = new Uint8Array(await blob.arrayBuffer());
          const text = await api.ai.transcribeAudio(buf, whisperContext);
          if (text) onTranscript(text);
        } catch {
          // chunk failed — will retry on next interval or final
        }
      }, 5000);
    } catch {
      alert("Microphone access denied. Grant permission in System Settings → Privacy & Security → Microphone.");
    }
  }

  function stopWhisperRecording() {
    // Stop chunk interval
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsRecording(false);
    stopTimer();

    // Final transcription on full audio
    finalTranscribe();
  }

  async function finalTranscribe() {
    if (allChunksRef.current.length === 0) return;
    setIsTranscribing(true);
    try {
      const blob = new Blob(allChunksRef.current, { type: "audio/webm" });
      const buf = new Uint8Array(await blob.arrayBuffer());
      const transcript = await api.ai.transcribeAudio(buf, whisperContext);
      if (transcript) {
        onTranscript(transcript);
        onFinal?.(transcript);
      }
    } catch (err) {
      console.error("Final transcription failed:", err);
      alert(`Transcription failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      setIsTranscribing(false);
      allChunksRef.current = [];
    }
  }

  function startRecording() {
    startWhisperRecording();
  }

  function stopRecording() {
    stopWhisperRecording();
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
      title="Record audio (Whisper transcription)"
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}
