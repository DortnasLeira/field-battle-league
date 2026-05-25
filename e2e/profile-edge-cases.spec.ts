import { test, expect, type Page } from "@playwright/test";

/**
 * Cobre cenários de borda para perfis públicos:
 * 1. IDs inexistentes → UI mostra mensagem de "não encontrado" e NÃO vaza
 *    nenhum campo sensível (e-mail, telefone, capitão, estatísticas).
 * 2. Perfis com campos nulos/vazios → UI não quebra, não imprime "null"
 *    nem "undefined", e segue ocultando informações restritas a visitantes.
 *
 * Não depende de credenciais — roda totalmente como visitante.
 */

const FAKE_UUID = "00000000-0000-0000-0000-000000000000";
const FAKE_SLUG = "perfil-que-nao-existe-xyz";

async function gotoAndSettle(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByText(/Carregando/i).first())
    .toBeHidden({ timeout: 10_000 })
    .catch(() => {});
}

async function expectNoLeaks(page: Page) {
  const body = page.locator("body");
  // Nunca renderizar literais de valores indefinidos
  await expect(body).not.toContainText(/\bundefined\b/);
  await expect(body).not.toContainText(/\bnull\b/);
  // Visitantes nunca devem ver e-mail ou telefone
  await expect(page.locator("a[href^='mailto:']")).toHaveCount(0);
  await expect(page.locator("a[href^='tel:']")).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// 1) Perfil inexistente
// ---------------------------------------------------------------------------
test.describe("Perfis inexistentes — mensagem clara e sem vazamento", () => {
  test("Time inexistente mostra 'não encontrado'", async ({ page }) => {
    await gotoAndSettle(page, `/time/${FAKE_UUID}`);
    await expect(page.getByText(/Time não encontrado/i)).toBeVisible();
    await expectNoLeaks(page);
    // Campos restritos jamais aparecem
    await expect(page.getByText(/^Capitão$/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Estatísticas/i })).toHaveCount(0);
  });

  test("Jogador inexistente mostra 'não encontrado'", async ({ page }) => {
    await gotoAndSettle(page, `/jogador/${FAKE_UUID}`);
    await expect(page.getByText(/Jogador não encontrado/i)).toBeVisible();
    await expectNoLeaks(page);
    await expect(page.getByRole("heading", { name: /Próximos jogos/i })).toHaveCount(0);
  });

  test("Árbitro inexistente mostra 'não encontrado'", async ({ page }) => {
    await gotoAndSettle(page, `/arbitro/${FAKE_SLUG}`);
    await expect(page.getByText(/Árbitro não encontrado/i)).toBeVisible();
    await expectNoLeaks(page);
    await expect(page.getByText(/avaliações/i)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 2) Perfis existentes com campos potencialmente nulos
// ---------------------------------------------------------------------------
// Usamos os mocks "t1" (Time) e "r1" (Árbitro) — confirmados nos testes de
// visibilidade — para garantir que o render não quebre mesmo se cidade,
// fundação, bio ou avaliação estiverem ausentes para um visitante.

test.describe("Perfis com campos nulos — UI resiliente", () => {
  test("Time t1: header renderiza sem 'null'/'undefined' para visitante", async ({
    page,
  }) => {
    await gotoAndSettle(page, "/time/t1");
    await expect(
      page.getByRole("heading", { name: /Leões da Vila/i }),
    ).toBeVisible();
    await expectNoLeaks(page);
  });

  test("Árbitro r1: header renderiza sem vazar contato para visitante", async ({
    page,
  }) => {
    await gotoAndSettle(page, "/arbitro/r1");
    await expect(
      page.getByRole("heading", { name: /Marcos Pereira/i }),
    ).toBeVisible();
    await expectNoLeaks(page);
    // sem bloco "Minhas Solicitações" (somente logado)
    await expect(
      page.getByRole("heading", { name: /Minhas Solicitações/i }),
    ).toHaveCount(0);
  });
});
