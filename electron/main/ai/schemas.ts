import { z } from "zod/v4";

export const ScoreFeedbackSchema = z.object({
  scores: z.object({
    clarity: z.number().min(1).max(10),
    relevance: z.number().min(1).max(10),
    ownership: z.number().min(1).max(10),
    technicalDepth: z.number().min(1).max(10),
    seniority: z.number().min(1).max(10),
    communication: z.number().min(1).max(10),
    conciseness: z.number().min(1).max(10),
    businessAwareness: z.number().min(1).max(10),
    overall: z.number().min(1).max(10),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  tags: z.array(z.string()),
  improvedAnswer: z.string(),
  interviewerConcerns: z.array(z.string()),
  suggestions: z.array(z.string()),
  signalsHit: z.array(z.string()).optional(),
  signalsMissed: z.array(z.string()).optional(),
});

export const SessionSummarySchema = z.object({
  overallScore: z.number().min(1).max(10),
  strengthsSummary: z.string(),
  weaknessSummary: z.string(),
  repeatedPatterns: z.array(z.string()),
  recommendedPracticeAreas: z.array(z.string()),
  interviewReadiness: z.enum(["not_ready", "needs_work", "almost_ready", "ready"]),
  keyInsights: z.array(z.string()),
});

export const GeneratedQuestionSchema = z.object({
  text: z.string(),
  category: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  expectedSignals: z.array(z.string()),
  rubricHints: z.string(),
});

export const QuestionBankGenerationSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).min(6).max(12),
});

export const CvAnalysisSchema = z.object({
  strengths: z.array(z.object({ point: z.string(), detail: z.string() })),
  gaps: z.array(z.object({ point: z.string(), detail: z.string(), suggestion: z.string() })),
  keywordSuggestions: z.array(z.object({ keyword: z.string(), reason: z.string() })),
  reorderSuggestions: z.array(z.object({ section: z.string(), recommendation: z.string() })),
  overallFit: z.enum(["strong", "moderate", "weak"]),
  summary: z.string(),
});

export type ScoreFeedback = z.infer<typeof ScoreFeedbackSchema>;
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export type QuestionBankGeneration = z.infer<typeof QuestionBankGenerationSchema>;
export type CvAnalysis = z.infer<typeof CvAnalysisSchema>;
