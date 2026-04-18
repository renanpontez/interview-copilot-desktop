import { streamText, generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  ScoreFeedbackSchema,
  SessionSummarySchema,
  QuestionBankGenerationSchema,
  CvAnalysisSchema,
  type ScoreFeedback,
  type SessionSummary,
  type QuestionBankGeneration,
  type CvAnalysis,
} from "./schemas";

export interface AIConfig {
  apiProvider: "openai" | "anthropic";
  apiKey: string;
  model?: string;
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  modelId: string;
  estimatedCostUsd: number;
}

const MODEL_DEFAULTS: Record<string, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5-20251001",
};

// Cost per 1M tokens (USD)
export const MODEL_PRICING: Record<
  string,
  { input: number; output: number; label: string; provider: "openai" | "anthropic" }
> = {
  "gpt-4o-mini": { input: 0.15, output: 0.60, label: "GPT-4o Mini", provider: "openai" },
  "gpt-4o": { input: 2.50, output: 10.00, label: "GPT-4o", provider: "openai" },
  "claude-haiku-4-5-20251001": { input: 0.80, output: 4.00, label: "Claude Haiku 4.5", provider: "anthropic" },
};

export function estimateCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return 0;
  return (
    (promptTokens / 1_000_000) * pricing.input +
    (completionTokens / 1_000_000) * pricing.output
  );
}

function resolveModelId(config: AIConfig): string {
  return config.model || MODEL_DEFAULTS[config.apiProvider];
}

function getModel(config: AIConfig) {
  const modelId = resolveModelId(config);

  if (config.apiProvider === "anthropic") {
    const provider = createAnthropic({ apiKey: config.apiKey });
    return provider(modelId);
  }

  const provider = createOpenAI({ apiKey: config.apiKey });
  return provider(modelId);
}

function buildUsage(
  config: AIConfig,
  usage: { inputTokens?: number; outputTokens?: number }
): AIUsage {
  const modelId = resolveModelId(config);
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  return {
    promptTokens: input,
    completionTokens: output,
    modelId,
    estimatedCostUsd: estimateCost(modelId, input, output),
  };
}

export async function generateInterviewResponse(
  config: AIConfig,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
) {
  return await streamText({
    model: getModel(config),
    system: systemPrompt,
    messages,
  });
}

export async function generateCoachFeedback(
  config: AIConfig,
  systemPrompt: string,
  question: string,
  answer: string,
  context: string
): Promise<{ feedback: ScoreFeedback; usage: AIUsage }> {
  const result = await generateObject({
    model: getModel(config),
    system: systemPrompt,
    prompt: `Interview context: ${context}\n\nQuestion asked: ${question}\n\nCandidate's answer: ${answer}\n\nProvide your evaluation.`,
    schema: ScoreFeedbackSchema,
  });
  return {
    feedback: result.object,
    usage: buildUsage(config, result.usage),
  };
}

export async function generateSessionSummary(
  config: AIConfig,
  systemPrompt: string,
  transcript: string
): Promise<{ summary: SessionSummary; usage: AIUsage }> {
  const result = await generateObject({
    model: getModel(config),
    system: systemPrompt,
    prompt: `Full interview transcript:\n\n${transcript}\n\nProvide your analysis.`,
    schema: SessionSummarySchema,
  });
  return {
    summary: result.object,
    usage: buildUsage(config, result.usage),
  };
}

export async function generateQuestionBank(
  config: AIConfig,
  systemPrompt: string,
  details: string
): Promise<{ questions: QuestionBankGeneration; usage: AIUsage }> {
  const result = await generateObject({
    model: getModel(config),
    system: systemPrompt,
    prompt: details,
    schema: QuestionBankGenerationSchema,
  });
  return {
    questions: result.object,
    usage: buildUsage(config, result.usage),
  };
}

export async function generateCvAnalysis(
  config: AIConfig,
  systemPrompt: string,
  cvText: string
): Promise<{ analysis: CvAnalysis; usage: AIUsage }> {
  const result = await generateObject({
    model: getModel(config),
    system: systemPrompt,
    prompt: `CV content:\n\n${cvText}\n\nAnalyze this CV against the job description.`,
    schema: CvAnalysisSchema,
  });
  return {
    analysis: result.object,
    usage: buildUsage(config, result.usage),
  };
}
