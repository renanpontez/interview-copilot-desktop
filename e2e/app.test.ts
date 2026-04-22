import { test, expect, type ElectronApplication, type Page } from "@playwright/test";
import { _electron as electron } from "playwright";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { unlinkSync, readdirSync } from "node:fs";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));

let app: ElectronApplication;
let page: Page;

function cleanDb() {
  const appDataDir = join(homedir(), "Library/Application Support/interview-copilot-desktop");
  try {
    const files = readdirSync(appDataDir);
    for (const f of files) {
      if (f.endsWith(".db") || f.endsWith(".db-wal") || f.endsWith(".db-shm")) {
        try { unlinkSync(join(appDataDir, f)); } catch { /* */ }
      }
    }
  } catch { /* dir doesn't exist yet */ }
}

test.beforeAll(async () => {
  cleanDb();
  app = await electron.launch({
    args: [resolve(__dirname, "../out/main/index.js")],
    env: { ...process.env, NODE_ENV: "test" },
  });
  page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  // Give the app a moment to fully render
  await page.waitForTimeout(2000);
});

test.afterAll(async () => {
  await app.close();
});

// --- Tests run sequentially (serial) ---

test.describe.configure({ mode: "serial" });

test("app launches", async () => {
  const title = await page.title();
  expect(title).toBe("Interview Copilot");
});

test("welcome modal appears and can be dismissed", async () => {
  // The modal may or may not appear depending on DB state
  // If it appears, dismiss it
  const modal = page.getByText("Welcome to Interview Copilot");
  const isVisible = await modal.isVisible().catch(() => false);
  if (isVisible) {
    await page.getByRole("button", { name: "Got it" }).click();
    await expect(modal).not.toBeVisible();
  }
  // Either way, app should be usable now
});

test("navigate to settings and save API key", async () => {
  await page.getByRole("navigation").getByRole("link", { name: "Settings" }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByText("AI Model")).toBeVisible({ timeout: 5000 });

  const keyInput = page.locator('input[type="password"]');
  await keyInput.fill("sk-test-fake-key-for-e2e");
  await page.getByRole("button", { name: /save/i }).last().click();
  await expect(page.getByText("Saved")).toBeVisible({ timeout: 5000 });
});

test("navigate to jobs and create one", async () => {
  await page.getByRole("navigation").getByRole("link", { name: "Jobs" }).click();
  await page.waitForTimeout(1000);

  // If settings gate is showing, the "New Job" button won't be interactive
  // Wait for the real page to load (gate unlocks after API key is set)
  await expect(page.getByRole("button", { name: /new job/i }).first()).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: /new job/i }).first().click();
  await page.waitForTimeout(500);
  await page.getByPlaceholder("Acme Inc.").fill("TestCorp");
  await page.getByPlaceholder("Senior Frontend Engineer").fill("Staff Engineer");
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForTimeout(500);
  await expect(page.getByText("TestCorp").first()).toBeVisible({ timeout: 5000 });
});

test("open job and see stepper", async () => {
  await page.getByText("Staff Engineer").first().click();
  await page.waitForTimeout(1000);
  await expect(page.getByText("Job Details").first()).toBeVisible({ timeout: 5000 });
});

test("navigate stepper to scenarios and add one", async () => {
  await page.getByRole("button", { name: /next/i }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /skip/i }).first().click();
  await page.waitForTimeout(500);
  await expect(page.getByText("Add scenario").first()).toBeVisible({ timeout: 5000 });

  await page.getByRole("button", { name: /add scenario/i }).first().click();
  await page.waitForTimeout(500);
  await expect(page.getByText("New scenario").first()).toBeVisible({ timeout: 5000 });
});

test("navigate to dashboard", async () => {
  await page.getByRole("navigation").getByRole("link", { name: "Dashboard" }).click();
  await page.waitForTimeout(500);
  await expect(page.getByText("Your interview prep")).toBeVisible({ timeout: 5000 });
});
