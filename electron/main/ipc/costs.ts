import { ipcMain } from "electron";
import { getDb } from "../db/client";
import type { SessionCosts, TokenUsage } from "../../types/domain";

export function registerCostHandlers() {
  ipcMain.handle("costs:get", (): SessionCosts => {
    const db = getDb();
    const rows = db
      .prepare(
        "SELECT operation, model_id, prompt_tokens, completion_tokens, cost_usd, created_at FROM token_usage ORDER BY created_at DESC LIMIT 200"
      )
      .all() as Array<{
      operation: string;
      model_id: string;
      prompt_tokens: number;
      completion_tokens: number;
      cost_usd: number;
      created_at: string;
    }>;

    const totals = db
      .prepare(
        "SELECT COALESCE(SUM(prompt_tokens),0) as tp, COALESCE(SUM(completion_tokens),0) as tc, COALESCE(SUM(cost_usd),0) as cost FROM token_usage"
      )
      .get() as { tp: number; tc: number; cost: number };

    const entries: TokenUsage[] = rows.map((r) => ({
      operation: r.operation,
      modelId: r.model_id,
      promptTokens: r.prompt_tokens,
      completionTokens: r.completion_tokens,
      estimatedCostUsd: r.cost_usd,
      timestamp: r.created_at,
    }));

    return {
      totalPromptTokens: totals.tp,
      totalCompletionTokens: totals.tc,
      totalCostUsd: totals.cost,
      entries,
    };
  });

  ipcMain.handle(
    "costs:track",
    (_e, entry: Omit<TokenUsage, "timestamp">) => {
      const now = new Date().toISOString();
      getDb()
        .prepare(
          "INSERT INTO token_usage (operation, model_id, prompt_tokens, completion_tokens, cost_usd, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run(
          entry.operation,
          entry.modelId,
          entry.promptTokens,
          entry.completionTokens,
          entry.estimatedCostUsd,
          now
        );
    }
  );

  ipcMain.handle("costs:reset", () => {
    getDb().prepare("DELETE FROM token_usage").run();
  });
}
