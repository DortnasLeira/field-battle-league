import { useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

// Rotas públicas (logado ou não, qualquer perfil pode ver).
const PUBLIC_PREFIXES = [
  "/buscar",
  "/campos",
  "/campo/",
  "/jogador/",
  "/time/",
  "/arbitro/",
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/",
];

// Rotas que exigem login.
const REQUIRES_AUTH = [
  "/perfil",
  "/onboarding",
  "/vagas",
  "/desafios",
  "/ligas",
  "/ranking",
  "/pro",
  "/sumula",
  "/checkout",
  "/painel",
];

// Rotas exclusivas por tipo de perfil.
const REQUIRES_FIELD_PROFILE = ["/complexo"];
const REQUIRES_REFEREE_PROFILE = ["/arbitragem"];
const REQUIRES_BUSINESS = ["/painel"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p)));
}

export function useRouteGuard() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session, loading, accountType, profiles } = useAuth();
  const navigate = useNavigate();
  const lastBlocked = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    const hasField = profiles.some((p) => p.type === "field");
    const hasReferee = profiles.some((p) => p.type === "referee");
    const isBusiness = accountType === "business";

    const block = (msg: string, to: string) => {
      if (lastBlocked.current === pathname) return;
      lastBlocked.current = pathname;
      toast.error(msg);
      navigate({ to });
    };

    // Sem sessão: só permite rotas públicas.
    if (!session) {
      if (!matches(pathname, PUBLIC_PREFIXES)) {
        block("Faça login para acessar esta página.", "/buscar");
      }
      return;
    }

    // Rotas exclusivas de árbitro.
    if (matches(pathname, REQUIRES_REFEREE_PROFILE) && !(isBusiness && hasReferee)) {
      block("Esta área é exclusiva para árbitros.", "/buscar");
      return;
    }

    // Rotas exclusivas de campo.
    if (matches(pathname, REQUIRES_FIELD_PROFILE) && !(isBusiness && hasField)) {
      block("Esta área é exclusiva para complexos esportivos.", "/buscar");
      return;
    }

    // Rotas Business em geral.
    if (matches(pathname, REQUIRES_BUSINESS) && !isBusiness) {
      block("Acesso restrito a contas Business.", "/buscar");
      return;
    }

    // Rota exige autenticação (já cobrimos !session acima; este é o catch-all).
    if (matches(pathname, REQUIRES_AUTH) && !session) {
      block("Faça login para acessar esta página.", "/auth");
      return;
    }

    lastBlocked.current = null;
  }, [pathname, session, loading, accountType, profiles, navigate]);
}
