// Shared domain types — used by both main and renderer via the contextBridge.

export interface Profile {
  context: string;
  updatedAt: string;
}

export type JobStatus =
  | "interested"
  | "applied"
  | "screening"
  | "technical"
  | "final"
  | "offer"
  | "closed";

export interface Job {
  id: string;
  company: string;
  role: string;
  jobDescription: string;
  status: JobStatus;
  notes: string;
  hasTailoredCv: boolean;
  currentStep?: number;
  createdAt: string;
  updatedAt: string;
}

export type ScenarioType =
  | "behavioral"
  | "technical"
  | "system-design"
  | "coding"
  | "culture-fit";

export interface Scenario {
  id: string;
  jobId: string;
  title: string;
  type: ScenarioType;
  questions: string;
  aiSuggestions: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ModelId =
  | "gpt-4o-mini"
  | "gpt-4o"
  | "claude-haiku-4-5-20251001";

export interface AppSettings {
  apiProvider: "openai" | "anthropic";
  model: ModelId;
  defaultDifficulty: "easy" | "medium" | "hard";
  defaultTone: "friendly" | "realistic" | "strict";
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  operation: string;
  modelId: string;
  timestamp: string;
}

export interface SessionCosts {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCostUsd: number;
  entries: TokenUsage[];
}

export interface StoredCv {
  blob: Uint8Array;
  fileName: string;
}

export interface InterviewSummary {
  overallScore: number;
  strengthsSummary: string;
  weaknessSummary: string;
  repeatedPatterns: string[];
  recommendedPracticeAreas: string[];
  interviewReadiness: "not_ready" | "needs_work" | "almost_ready" | "ready";
  keyInsights: string[];
}

export interface InterviewLog {
  id: string;
  scenarioId: string;
  jobId: string;
  messages: { role: string; content: string }[];
  scores: { questionText: string; overall: number; feedback: string }[];
  summary: InterviewSummary | null;
  userNotes: string;
  userAiRating: number | null;
  userAiFeedback: string;
  status: "completed" | "in_progress";
  durationSec: number;
  createdAt: string;
  updatedAt: string;
}
