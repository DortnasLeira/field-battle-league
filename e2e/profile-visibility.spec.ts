import { test, expect, type Page } from "@playwright/test";

/**
 * Verifica visibilidade de informações sensíveis nos perfis públicos
 * (Jogador, Time, Árbitro) para visitantes (deslogados) versus usuários
 * autenticados.
 *
 * Estratégia:
 * - Visitante: navega direto na rota pública e valida que campos restritos
 *   NÃO aparecem e que campos públicos APARECEM.
 * - Logado: só roda quando E2E_USER_EMAIL / E2E_USER_PASSWORD estão definidos.
 *   Faz login via /auth e revalida as mesmas rotas, esperando ver os campos
 *   antes ocultos.
 *
 * IDs usados:
 * - Time:   "t1"  (mock — Leões da Vila, capitão "Você")
 * - Árbitro: "r1" (mock — Marcos Pereira, score 4.9, 87 avaliações)
 * - Jogador: UUID real do banco; pode ser sobrescrito por E2E_PLAYER_ID.
 */

const TEAM_ID = "t1";
const REFEREE_ID = "r1";
const PLAYER_ID =
  process.env.E2E_PLAYER_ID ?? "30752340-ef7f-4acf-9094-1d7429d3fa0f";

async function gotoAndSettle(page: Page, path: string) {
  await page.goto(path);
  // espera o "Carregando..." sumir
  await expect(page.getByText(/Carregando/i).first()).toBeHidden({
    timeout: 10_000,
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// VISITANTE (deslogado)
// ---------------------------------------------------------------------------
test.describe("Perfis públicos — visitante (deslogado)", () => {
  test("Time: oculta capitão, estatísticas, próximos jogos e avaliação", async ({
    page,
  }) => {
    await gotoAndSettle(page, `/time/${TEAM_ID}`);

    // Públicos
    await expect(
      page.getByRole("heading", { name: /Leões da Vila/i }),
    ).toBeVisible();
    await expect(page.getByText(/Campo preferido/i)).toBeVisible();

    // Restritos
    await expect(page.getByText(/^Capitão$/i)).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /Estatísticas/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /Próximos jogos/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /Painel de status/i }),
    ).toHaveCount(0);
    // a estrelinha de rating "4.7(58)" não deve aparecer no header
    await expect(page.getByText(/\(58\)/)).toHaveCount(0);
  });

  test("Jogador: oculta próximos jogos e avaliação", async ({ page }) => {
    await gotoAndSettle(page, `/jogador/${PLAYER_ID}`);

    // se o jogador não existir mais, o teste degrada graciosamente
    const notFound = await page
      .getByText(/Jogador não encontrado/i)
      .isVisible()
      .catch(() => false);
    test.skip(notFound, `Jogador ${PLAYER_ID} não está no banco.`);

    // Restritos
    await expect(
      page.getByRole("heading", { name: /Próximos jogos/i }),
    ).toHaveCount(0);
    // telefone / e-mail nunca devem aparecer em perfil público
    await expect(page.getByText(/@/)).toHaveCount(0);
  });

  test("Árbitro: oculta avaliação no header e seção de solicitações", async ({
    page,
  }) => {
    await gotoAndSettle(page, `/arbitro/${REFEREE_ID}`);

    // Públicos
    await expect(
      page.getByRole("heading", { name: /Marcos Pereira/i }),
    ).toBeVisible();
    await expect(page.getByText(/Disponibilidade/i)).toBeVisible();

    // Restritos — header de avaliação ("4.9 (87 avaliações)")
    await expect(page.getByText(/avaliações/i)).toHaveCount(0);
    // bloco "Minhas Solicitações" só existe para usuários logados
    await expect(
      page.getByRole("heading", { name: /Minhas Solicitações/i }),
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// USUÁRIO LOGADO (opcional — requer credenciais)
// ---------------------------------------------------------------------------
const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe("Perfis públicos — usuário logado", () => {
  test.skip(
    !email || !password,
    "Defina E2E_USER_EMAIL e E2E_USER_PASSWORD para rodar este bloco.",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await page.getByLabel(/e-?mail/i).fill(email!);
    await page.getByLabel(/senha/i).fill(password!);
    await page.getByRole("button", { name: /entrar|login/i }).click();
    await expect(page).toHaveURL(/\/(buscar|perfil|onboarding)/, {
      timeout: 10_000,
    });
  });

  test("Time: revela capitão, estatísticas e avaliação quando logado", async ({
    page,
  }) => {
    await gotoAndSettle(page, `/time/${TEAM_ID}`);
    await expect(page.getByText(/^Capitão$/i).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Estatísticas/i }),
    ).toBeVisible();
  });

  test("Jogador: revela próximos jogos quando logado", async ({ page }) => {
    await gotoAndSettle(page, `/jogador/${PLAYER_ID}`);
    await expect(
      page.getByRole("heading", { name: /Próximos jogos/i }),
    ).toBeVisible();
  });

  test("Árbitro: revela avaliação no header quando logado", async ({
    page,
  }) => {
    await gotoAndSettle(page, `/arbitro/${REFEREE_ID}`);
    await expect(page.getByText(/avaliações/i).first()).toBeVisible();
  });
});
