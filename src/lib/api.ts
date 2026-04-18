// Thin typed wrapper around the preload bridge.
// Phase 1: stubs so the renderer can compile while IPC isn't wired yet.
// Phase 2: real calls via `window.api` from preload.

import type { AppSettings, Job, Profile, Scenario, SessionCosts, StoredCv, TokenUsage } from "@shared/domain";

declare global {
  interface Window {
    api?: DesktopApi;
  }
}

export interface DesktopApi {
  profile: {
    get: () => Promise<Profile>;
    set: (context: string) => Promise<Profile>;
  };
  settings: {
    get: () => Promise<AppSettings>;
    set: (patch: Partial<AppSettings>) => Promise<AppSettings>;
    getApiKey: () => Promise<string | null>;
    setApiKey: (key: string) => Promise<void>;
    isWelcomeDismissed: () => Promise<boolean>;
    dismissWelcome: () => Promise<void>;
  };
  jobs: {
    list: () => Promise<Job[]>;
    get: (id: string) => Promise<Job | null>;
    save: (job: Job) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };
  scenarios: {
    listForJob: (jobId: string) => Promise<Scenario[]>;
    save: (scenario: Scenario) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };
  cvs: {
    getBase: () => Promise<StoredCv | null>;
    setBase: (data: Uint8Array, fileName: string) => Promise<void>;
    deleteBase: () => Promise<void>;
    getForJob: (jobId: string) => Promise<StoredCv | null>;
    setForJob: (jobId: string, data: Uint8Array, fileName: string) => Promise<void>;
    cloneBaseToJob: (jobId: string) => Promise<StoredCv | null>;
    deleteForJob: (jobId: string) => Promise<void>;
  };
  costs: {
    get: () => Promise<SessionCosts>;
    track: (entry: Omit<TokenUsage, "timestamp">) => Promise<SessionCosts>;
    reset: () => Promise<void>;
  };
  ai: {
    generateQuestions: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
    scoreAnswer: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
    analyzeCv: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
    transcribeAudio: (data: Uint8Array, context?: string) => Promise<string>;
    chat: {
      start: (input: Record<string, unknown>) => Promise<void>;
      onChunk: (cb: (data: { text: string }) => void) => () => void;
      onDone: (cb: (data: { fullText: string; usage: unknown }) => void) => () => void;
    };
  };
  backup: {
    exportAll: () => Promise<string>;
    importAll: (json: string) => Promise<void>;
  };
  app: {
    openExternal: (url: string) => Promise<void>;
    getVersion: () => Promise<string>;
  };
}

function missingBridge(): never {
  throw new Error(
    "Preload bridge not available. Make sure the app is running inside Electron."
  );
}

function createStubApi(): DesktopApi {
  return new Proxy({} as DesktopApi, {
    get() {
      return () => missingBridge();
    },
  });
}

export const api: DesktopApi =
  typeof window !== "undefined" && window.api
    ? window.api
    : createStubApi();
