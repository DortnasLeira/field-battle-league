import { test, expect, type Page } from "@playwright/test";

/**
 * Cobre cenários de borda para perfis públicos usando seletores estáveis
 * (data-testid) em vez de strings de texto:
 *
 * 1. IDs inexistentes → renderiza [data-testid="not-found"] e nenhuma
 *    seção restrita aparece.
 * 2. Perfis existentes com campos potencialmente nulos → root
 *    [data-testid="<persona>-profile"][data-visitor="true"] aparece e a UI
 *    não imprime "null"/"undefined" nem expõe contato.
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
  await expect(body).not.toContainText(/\bundefined\b/);
  await expect(body).not.toContainText(/\bnull\b/);
  await expect(page.locator("a[href^='mailto:']")).toHaveCount(0);
  await expect(page.locator("a[href^='tel:']")).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// 1) Perfil inexistente
// ---------------------------------------------------------------------------
test.describe("Perfis inexistentes — mensagem clara e sem vazamento", () => {
  test("Time inexistente: mostra not-found e nenhuma seção do perfil", async ({
    page,
  }) => {
    await gotoAndSettle(page, `/time/${FAKE_UUID}`);
    await expect(page.getByTestId("not-found")).toBeVisible();
    await expect(page.getByTestId("team-profile")).toHaveCount(0);
    await expect(page.getByTestId("team-captain-pill")).toHaveCount(0);
    await expect(page.getByTestId("team-stats")).toHaveCount(0);
    await expect(page.getByTestId("team-upcoming-games")).toHaveCount(0);
    await expect(page.getByTestId("team-status-panel")).toHaveCount(0);
    await expectNoLeaks(page);
  });

  test("Jogador inexistente: mostra not-found e nenhuma seção do perfil", async ({
    page,
  }) => {
    await gotoAndSettle(page, `/jogador/${FAKE_UUID}`);
    await expect(page.getByTestId("not-found")).toBeVisible();
    await expect(page.getByTestId("player-profile")).toHaveCount(0);
    await expect(page.getByTestId("player-upcoming-games")).toHaveCount(0);
    await expectNoLeaks(page);
  });

  test("Árbitro inexistente: mostra not-found e nenhuma seção do perfil", async ({
    page,
  }) => {
    await gotoAndSettle(page, `/arbitro/${FAKE_SLUG}`);
    await expect(page.getByTestId("not-found")).toBeVisible();
    await expect(page.getByTestId("referee-profile")).toHaveCount(0);
    await expect(page.getByTestId("referee-rating")).toHaveCount(0);
    await expect(page.getByTestId("referee-my-requests")).toHaveCount(0);
    await expectNoLeaks(page);
  });
});

// ---------------------------------------------------------------------------
// 2) Perfis existentes com campos nulos — UI resiliente
// ---------------------------------------------------------------------------
test.describe("Perfis com campos nulos — UI resiliente", () => {
  test("Time t1: root visitante e sem 'null'/'undefined' no DOM", async ({
    page,
  }) => {
    await gotoAndSettle(page, "/time/t1");
    const root = page.getByTestId("team-profile");
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute("data-visitor", "true");

    // Mesmo com campos faltando, nenhuma seção restrita escapa
    await expect(page.getByTestId("team-captain-pill")).toHaveCount(0);
    await expect(page.getByTestId("team-stats")).toHaveCount(0);
    await expect(page.getByTestId("team-rating")).toHaveCount(0);
    await expect(page.getByTestId("team-upcoming-games")).toHaveCount(0);

    await expectNoLeaks(page);
  });

  test("Árbitro r1: root visitante e sem bloco de solicitações", async ({
    page,
  }) => {
    await gotoAndSettle(page, "/arbitro/r1");
    const root = page.getByTestId("referee-profile");
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute("data-visitor", "true");

    await expect(page.getByTestId("referee-rating")).toHaveCount(0);
    await expect(page.getByTestId("referee-my-requests")).toHaveCount(0);

    await expectNoLeaks(page);
  });
});
