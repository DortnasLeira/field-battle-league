import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config.
 *
 * Por padrão roda contra o preview do projeto. Para usar outro alvo, defina
 * E2E_BASE_URL antes de chamar `playwright test`.
 *
 * Exemplos:
 *   bunx playwright install --with-deps chromium
 *   bunx playwright test
 *   E2E_BASE_URL=http://localhost:5173 bunx playwright test
 */
const baseURL =
  process.env.E2E_BASE_URL ??
  "https://id-preview--f03d0180-c43f-47ba-9b22-a8b83db1125d.lovable.app";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
