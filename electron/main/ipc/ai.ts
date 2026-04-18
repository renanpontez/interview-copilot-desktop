import { ipcMain, BrowserWindow } from "electron";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFile, unlink } from "node:fs/promises";
import { createReadStream } from "node:fs";
import OpenAI from "openai";
import {
  generateQuestionBank,
  generateCoachFeedback,
  generateCvAnalysis,
  generateInterviewResponse,
  type AIConfig,
  type AIUsage,
} from "../ai/client";
import {
  getQuestionGenerationPrompt,
  getCoachSystemPrompt,
  getCvAnalysisPrompt,
  getInterviewerSystemPrompt,
} from "../ai/prompts";

let _getApiKey: () => Promise<string | null> = async () => null;

export function setApiKeyGetter(fn: () => Promise<string | null>) {
  _getApiKey = fn;
}

async function requireConfig(overrides?: Partial<AIConfig>): Promise<AIConfig> {
  const key = await _getApiKey();
  if (!key) throw new Error("API key not configured");
  return {
    apiProvider: (overrides?.apiProvider as AIConfig["apiProvider"]) || "openai",
    apiKey: key,
    model: overrides?.model,
  };
}

export function registerAiHandlers() {
  // --- Generate Questions ---
  ipcMain.handle("ai:generateQuestions", async (_e, input: {
    apiProvider?: string;
    model?: string;
    scenarioType: string;
    targetRole: string;
    targetCompany?: string;
    jobDescription?: string;
    difficulty: string;
    profileContext?: string;
    questionCount?: number;
  }) => {
    const config = await requireConfig({ apiProvider: input.apiProvider as AIConfig["apiProvider"], model: input.model });
    const systemPrompt = getQuestionGenerationPrompt({
      scenarioType: input.scenarioType,
      targetRole: input.targetRole,
      targetCompany: input.targetCompany || "",
      jobDescription: input.jobDescription || "",
      difficulty: input.difficulty,
      profileContext: input.profileContext || "",
      questionCount: input.questionCount,
    });
    const { questions, usage } = await generateQuestionBank(config, systemPrompt, "Generate the interview questions as specified.");
    return { ...questions, usage };
  });

  // --- Score Answer ---
  ipcMain.handle("ai:scoreAnswer", async (_e, input: {
    apiProvider?: string;
    model?: string;
    questionText: string;
    answerText: string;
    scenarioType?: string;
    targetRole?: string;
    difficulty?: string;
    profileContext?: string;
    questionRubric?: { expectedSignals: string[]; rubricHints: string } | null;
  }) => {
    const config = await requireConfig({ apiProvider: input.apiProvider as AIConfig["apiProvider"], model: input.model });
    const coachPrompt = getCoachSystemPrompt(
      input.profileContext ? { summary: input.profileContext } : null,
      input.questionRubric || null
    );
    const context = `Scenario: ${input.scenarioType || "behavioral"}, Role: ${input.targetRole || "Engineer"}, Difficulty: ${input.difficulty || "medium"}`;
    const { feedback, usage } = await generateCoachFeedback(config, coachPrompt, input.questionText, input.answerText, context);
    return { feedback, usage };
  });

  // --- Analyze CV ---
  ipcMain.handle("ai:analyzeCv", async (_e, input: {
    apiProvider?: string;
    model?: string;
    jobDescription: string;
    cvText: string;
    profileContext?: string;
  }) => {
    const config = await requireConfig({ apiProvider: input.apiProvider as AIConfig["apiProvider"], model: input.model });
    const systemPrompt = getCvAnalysisPrompt({
      jobDescription: input.jobDescription,
      profileContext: input.profileContext || "",
    });
    const { analysis, usage } = await generateCvAnalysis(config, systemPrompt, input.cvText);
    return { ...analysis, usage };
  });

  // --- Transcribe Audio ---
  ipcMain.handle("ai:transcribeAudio", async (_e, audioData: Uint8Array, context?: string) => {
    const key = await _getApiKey();
    if (!key) throw new Error("API key not configured");

    // Write to temp file (OpenAI SDK needs a file-like stream)
    const tmpPath = join(tmpdir(), `ic-audio-${Date.now()}.webm`);
    await writeFile(tmpPath, Buffer.from(audioData));

    try {
      const openai = new OpenAI({ apiKey: key });
      const transcription = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: createReadStream(tmpPath),
        language: "en",
        temperature: 0,
        prompt: context || "Job interview answer. May include technical terms.",
      });
      return transcription.text;
    } finally {
      unlink(tmpPath).catch(() => {});
    }
  });

  // --- Streaming Chat ---
  ipcMain.handle("ai:chat:start", async (event, input: {
    apiProvider?: string;
    model?: string;
    systemPrompt: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  }) => {
    const config = await requireConfig({ apiProvider: input.apiProvider as AIConfig["apiProvider"], model: input.model });
    const result = await generateInterviewResponse(config, input.systemPrompt, input.messages);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;

    let fullText = "";
    for await (const chunk of result.textStream) {
      fullText += chunk;
      win.webContents.send("ai:chat:chunk", { text: chunk });
    }

    const usage = await result.usage;
    const modelId = config.model || (config.apiProvider === "anthropic" ? "claude-haiku-4-5-20251001" : "gpt-4o-mini");
    const inputTokens = usage?.inputTokens ?? 0;
    const outputTokens = usage?.outputTokens ?? 0;

    // Import cost estimation
    const { estimateCost } = await import("../ai/client");
    const aiUsage: AIUsage = {
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      modelId,
      estimatedCostUsd: estimateCost(modelId, inputTokens, outputTokens),
    };

    win.webContents.send("ai:chat:done", { fullText, usage: aiUsage });
  });
}
