import { test, expect, type Page } from "@playwright/test";

/**
 * Verifica que o toast do sonner exibiu uma mensagem contendo `expected`.
 * O sonner renderiza com `data-sonner-toast` e `data-type="error"`.
 */
async function expectErrorToast(page: Page, expected: RegExp) {
  const toast = page.locator('[data-sonner-toast][data-type="error"]').first();
  await expect(toast).toBeVisible({ timeout: 5_000 });
  await expect(toast).toContainText(expected);
}

test.describe("Guard de rotas exclusivas — usuário deslogado", () => {
  test("/arbitragem redireciona para /auth com toast", async ({ page }) => {
    await page.goto("/arbitragem");
    await expectErrorToast(page, /árbitro|login/i);
    await expect(page).toHaveURL(/\/(auth|buscar)(\?|$)/);
  });

  test("/complexo redireciona para /auth com toast", async ({ page }) => {
    await page.goto("/complexo");
    await expectErrorToast(page, /complexo|login/i);
    await expect(page).toHaveURL(/\/(auth|buscar)(\?|$)/);
  });
});

test.describe("Guard de rotas exclusivas — perfil incorreto", () => {
  // Para rodar este bloco, exporte credenciais de um usuário Esportista
  // (sem perfis Business) antes de chamar o Playwright:
  //   export E2E_SPORTIST_EMAIL=...
  //   export E2E_SPORTIST_PASSWORD=...
  const email = process.env.E2E_SPORTIST_EMAIL;
  const password = process.env.E2E_SPORTIST_PASSWORD;

  test.skip(
    !email || !password,
    "Defina E2E_SPORTIST_EMAIL e E2E_SPORTIST_PASSWORD para executar.",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await page.getByLabel(/e-?mail/i).fill(email!);
    await page.getByLabel(/senha/i).fill(password!);
    await page.getByRole("button", { name: /entrar|login/i }).click();
    await expect(page).toHaveURL(/\/(buscar|perfil|onboarding)/, { timeout: 10_000 });
  });

  test("/arbitragem bloqueia esportista e redireciona para /buscar", async ({ page }) => {
    await page.goto("/arbitragem");
    await expectErrorToast(page, /exclusiva para árbitros/i);
    await expect(page).toHaveURL(/\/buscar/);
  });

  test("/complexo bloqueia esportista e redireciona para /buscar", async ({ page }) => {
    await page.goto("/complexo");
    await expectErrorToast(page, /exclusiva para complexos/i);
    await expect(page).toHaveURL(/\/buscar/);
  });
});
