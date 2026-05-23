import { useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

/**
 * Pattern matcher with support for `:param` wildcards.
 * Examples:
 *   "/campo/:id/editar"       matches "/campo/abc/editar"
 *   "/campo/:id"              matches "/campo/abc" but NOT "/campo/abc/editar"
 *   "/campos"                 matches "/campos" and "/campos/..." (prefix)
 *
 * Patterns containing `:` are treated as exact segment patterns.
 * Patterns without `:` are treated as prefix matches.
 */
function patternToRegex(pattern: string): RegExp {
  if (!pattern.includes(":")) {
    if (pattern === "/") return /^\/$/;
    // prefix match: exact path or path followed by /
    const esc = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^${esc}(\\/.*)?$`);
  }
  const esc = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/:\w+/g, "[^/]+");
  return new RegExp(`^${esc}$`);
}

function anyMatch(pathname: string, patterns: string[]) {
  return patterns.some((p) => patternToRegex(p).test(pathname));
}

// Rotas estritamente públicas (sem login).
// IMPORTANTE: usar padrões exatos (`/campo/:id`) em vez de prefixos
// para que sub-rotas owner-only (ex.: `/campo/:id/editar`) não vazem.
const PUBLIC_PATTERNS = [
  "/",
  "/buscar",
  "/campos",
  "/campo/:id",
  "/jogador/:id",
  "/time/:id",
  "/arbitro/:id",
  "/auth",
  "/forgot-password",
  "/reset-password",
];

// Rotas que exigem apenas login (qualquer perfil).
const REQUIRES_AUTH_PATTERNS = [
  "/perfil",
  "/perfil/editar",
  "/onboarding",
  "/vagas",
  "/desafios",
  "/ligas",
  "/ranking",
  "/pro",
  "/checkout",
];

// Rotas owner-only (login obrigatório; a página valida ownership no servidor).
const REQUIRES_OWNER_PATTERNS = [
  "/campo/:id/editar",
  "/time/:id/transferir",
  "/sumula/:id",
];

// Rotas exclusivas por tipo de perfil.
const REQUIRES_FIELD_PATTERNS = ["/complexo", "/complexo/editar"];
const REQUIRES_REFEREE_PATTERNS = ["/arbitragem"];
const REQUIRES_BUSINESS_PATTERNS = ["/painel"];

export function useRouteGuard() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session, loading, accountType, profiles } = useAuth();
  const navigate = useNavigate();
  const lastBlocked = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    const hasField = profiles.some((p) => p.type === "field");
    const hasReferee = profiles.some((p) => p.type === "referee");
    const isBusiness = isBusinessAccount(accountType);

    const block = (msg: string, to: string) => {
      if (lastBlocked.current === pathname) return;
      lastBlocked.current = pathname;
      toast.error(msg);
      navigate({ to });
    };

    // 1) Rotas exclusivas por tipo de perfil (verificadas antes de "auth" genérica).
    if (anyMatch(pathname, REQUIRES_REFEREE_PATTERNS)) {
      if (!session) return block("Faça login para acessar a área do árbitro.", "/auth");
      if (!(isBusiness && hasReferee)) return block("Esta área é exclusiva para árbitros.", "/buscar");
      lastBlocked.current = null;
      return;
    }

    if (anyMatch(pathname, REQUIRES_FIELD_PATTERNS)) {
      if (!session) return block("Faça login para acessar seu complexo.", "/auth");
      if (!(isBusiness && hasField)) return block("Esta área é exclusiva para complexos esportivos.", "/buscar");
      lastBlocked.current = null;
      return;
    }

    if (anyMatch(pathname, REQUIRES_BUSINESS_PATTERNS)) {
      if (!session) return block("Faça login para acessar o painel.", "/auth");
      if (!isBusiness) return block("Acesso restrito a contas Business.", "/buscar");
      lastBlocked.current = null;
      return;
    }

    // 2) Rotas owner-only: exige login; a página valida o ownership e redireciona
    //    caso o recurso não pertença ao usuário.
    if (anyMatch(pathname, REQUIRES_OWNER_PATTERNS)) {
      if (!session) return block("Faça login para acessar este recurso.", "/auth");
      lastBlocked.current = null;
      return;
    }

    // 3) Rotas que exigem apenas login.
    if (anyMatch(pathname, REQUIRES_AUTH_PATTERNS)) {
      if (!session) return block("Faça login para acessar esta página.", "/auth");
      lastBlocked.current = null;
      return;
    }

    // 4) Rotas públicas: liberadas para qualquer um (logado ou não).
    if (anyMatch(pathname, PUBLIC_PATTERNS)) {
      lastBlocked.current = null;
      return;
    }

    // 5) Catch-all: se não está logado e a rota não é pública, manda para /buscar.
    if (!session) {
      return block("Faça login para acessar esta página.", "/buscar");
    }

    lastBlocked.current = null;
  }, [pathname, session, loading, accountType, profiles, navigate]);
}
