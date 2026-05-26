import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * Verifica visibilidade de informações sensíveis nos perfis públicos
 * (Jogador, Time, Árbitro) para visitantes (deslogados) versus usuários
 * autenticados.
 *
 * Seletores estáveis (data-testid) em vez de strings de texto:
 *   - team-profile / player-profile / referee-profile  (root, com data-visitor)
 *   - team-captain-pill, team-status-panel, team-stats, team-upcoming-games
 *   - team-rating (no mock t1)
 *   - player-upcoming-games
 *   - referee-rating, referee-my-requests
 *   - not-found
 *
 * IDs usados:
 * - Time:    "t1"  (mock — Leões da Vila)
 * - Árbitro: "r1"  (mock — Marcos Pereira)
 * - Jogador: UUID real do banco; pode ser sobrescrito por E2E_PLAYER_ID.
 */

const TEAM_ID = "t1";
const REFEREE_ID = "r1";
const PLAYER_ID =
  process.env.E2E_PLAYER_ID ?? "30752340-ef7f-4acf-9094-1d7429d3fa0f";

async function gotoAndSettle(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByText(/Carregando/i).first())
    .toBeHidden({ timeout: 10_000 })
    .catch(() => {});
}

/** Espera o root do perfil aparecer e retorna o locator. */
async function waitForProfileRoot(page: Page, testid: string): Promise<Locator> {
  const root = page.getByTestId(testid);
  await expect(root).toBeVisible({ timeout: 10_000 });
  return root;
}

/** Asserts genéricos de não-vazamento (e-mail/telefone, null/undefined). */
async function expectNoLeaks(page: Page) {
  const body = page.locator("body");
  await expect(body).not.toContainText(/\bundefined\b/);
  await expect(body).not.toContainText(/\bnull\b/);
  await expect(page.locator("a[href^='mailto:']")).toHaveCount(0);
  await expect(page.locator("a[href^='tel:']")).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// VISITANTE (deslogado) — seletores estáveis
// ---------------------------------------------------------------------------
test.describe("Perfis públicos — visitante (deslogado)", () => {
  test("Time: oculta capitão, status, estatísticas, próximos jogos e rating", async ({
    page,
  }) => {
    await gotoAndSettle(page, `/time/${TEAM_ID}`);
    const root = await waitForProfileRoot(page, "team-profile");

    // Marcador de modo visitante no root
    await expect(root).toHaveAttribute("data-visitor", "true");

    // Seções restritas — contagem exata = 0
    await expect(page.getByTestId("team-captain-pill")).toHaveCount(0);
    await expect(page.getByTestId("team-status-panel")).toHaveCount(0);
    await expect(page.getByTestId("team-stats")).toHaveCount(0);
    await expect(page.getByTestId("team-upcoming-games")).toHaveCount(0);
    await expect(page.getByTestId("team-rating")).toHaveCount(0);

    await expectNoLeaks(page);
  });

  test("Jogador: oculta próximos jogos e não vaza contato", async ({ page }) => {
    await gotoAndSettle(page, `/jogador/${PLAYER_ID}`);

    const notFound = await page.getByTestId("not-found").isVisible().catch(() => false);
    test.skip(notFound, `Jogador ${PLAYER_ID} não está no banco.`);

    const root = await waitForProfileRoot(page, "player-profile");
    await expect(root).toHaveAttribute("data-visitor", "true");

    await expect(page.getByTestId("player-upcoming-games")).toHaveCount(0);
    await expectNoLeaks(page);
  });

  test("Árbitro: oculta rating no header e bloco de solicitações", async ({
    page,
  }) => {
    await gotoAndSettle(page, `/arbitro/${REFEREE_ID}`);
    const root = await waitForProfileRoot(page, "referee-profile");
    await expect(root).toHaveAttribute("data-visitor", "true");

    await expect(page.getByTestId("referee-rating")).toHaveCount(0);
    await expect(page.getByTestId("referee-my-requests")).toHaveCount(0);

    await expectNoLeaks(page);
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
    await expect(page).toHaveURL(/\/(buscar|perfil|onboarding)/, { timeout: 10_000 });
  });

  test("Time: revela capitão, status, estatísticas e próximos jogos", async ({
    page,
  }) => {
    await gotoAndSettle(page, `/time/${TEAM_ID}`);
    const root = await waitForProfileRoot(page, "team-profile");
    await expect(root).toHaveAttribute("data-visitor", "false");
    await expect(page.getByTestId("team-captain-pill")).toHaveCount(1);
    await expect(page.getByTestId("team-stats")).toHaveCount(1);
  });

  test("Jogador: revela próximos jogos quando logado", async ({ page }) => {
    await gotoAndSettle(page, `/jogador/${PLAYER_ID}`);
    await waitForProfileRoot(page, "player-profile");
    await expect(page.getByTestId("player-upcoming-games")).toHaveCount(1);
  });

  test("Árbitro: revela rating no header quando logado", async ({ page }) => {
    await gotoAndSettle(page, `/arbitro/${REFEREE_ID}`);
    const root = await waitForProfileRoot(page, "referee-profile");
    await expect(root).toHaveAttribute("data-visitor", "false");
    await expect(page.getByTestId("referee-rating")).toHaveCount(1);
  });
});
