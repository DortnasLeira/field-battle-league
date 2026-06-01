import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import {
  useAuth,
  isBusinessAccount,
  type AccountType,
  type UserProfile,
} from "@/lib/auth";

/**
 * Requisitos de acesso suportados pelas rotas protegidas.
 * - `auth`: apenas exige login.
 * - `business`: exige conta Business (campo OU árbitro). Para compat também
 *   aceita usuários que possuem perfis `field`/`referee` mesmo enquanto o
 *   `account_type` ainda está sendo migrado.
 * - `field`: exclusivo do complexo (perfil Campo / business_field).
 * - `referee`: exclusivo de árbitros (perfil Referee / business_referee).
 */
export type AccessRequirement = "auth" | "business" | "field" | "referee";

export type ProtectedAccessOptions = {
  /** Caminho para redirecionar quando não logado. Default: `/auth`. */
  authRedirect?: string;
  /** `search.redirect` enviado ao /auth (caminho da rota atual). */
  redirectBack?: string;
  /** Caminho usado quando o usuário está logado mas não tem permissão. Default: `/buscar`. */
  deniedRedirect?: string;
  /** Mensagem do toast quando não logado. */
  unauthMessage?: string;
  /** Mensagem do toast quando logado mas sem permissão. */
  deniedMessage?: string;
};

export type ProtectedAccessState =
  | { status: "loading"; session: Session | null }
  | {
      status: "ready";
      session: Session;
      accountType: AccountType | null;
      activeProfile: UserProfile | null;
      profiles: UserProfile[];
    };

/**
 * Hook compartilhado para tratar o estado de carregamento de sessão + perfis
 * + accountType em rotas protegidas, evitando flashes de conteúdo incorreto
 * ou redirects prematuros enquanto o `useAuth()` ainda está hidratando.
 *
 * Uso típico:
 * ```tsx
 * const access = useProtectedAccess("field", { redirectBack: "/complexo" });
 * if (access.status === "loading") return <RouteLoadingSkeleton />;
 * // a partir daqui access.session etc. estão garantidos
 * ```
 */
export function useProtectedAccess(
  requirement: AccessRequirement,
  options: ProtectedAccessOptions = {},
): ProtectedAccessState {
  const {
    authRedirect = "/auth",
    redirectBack,
    deniedRedirect = "/buscar",
    unauthMessage,
    deniedMessage,
  } = options;

  const { session, loading, profilesLoaded, accountType, profiles, activeProfile } =
    useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);

  const hasField = profiles.some((p) => p.type === "field");
  const hasReferee = profiles.some((p) => p.type === "referee");
  const isBusiness =
    isBusinessAccount(accountType) ||
    hasField ||
    hasReferee ||
    activeProfile?.type === "field" ||
    activeProfile?.type === "referee";

  const allowed = (() => {
    if (!session) return false;
    switch (requirement) {
      case "auth":
        return true;
      case "business":
        return isBusiness;
      case "field":
        return accountType === "business_field" || hasField || activeProfile?.type === "field";
      case "referee":
        return (
          accountType === "business_referee" || hasReferee || activeProfile?.type === "referee"
        );
    }
  })();

  const bootstrapping = loading || (!!session && !profilesLoaded);

  useEffect(() => {
    if (bootstrapping) {
      handled.current = false;
      return;
    }
    if (handled.current) return;

    if (!session) {
      handled.current = true;
      if (unauthMessage) toast.error(unauthMessage);
      navigate({
        to: authRedirect,
        search: redirectBack ? { redirect: redirectBack } : undefined,
      });
      return;
    }

    if (!allowed) {
      handled.current = true;
      if (deniedMessage) toast.error(deniedMessage);
      navigate({ to: deniedRedirect });
    }
  }, [
    bootstrapping,
    session,
    allowed,
    authRedirect,
    redirectBack,
    deniedRedirect,
    unauthMessage,
    deniedMessage,
    navigate,
  ]);

  if (bootstrapping || !session || !allowed) {
    return { status: "loading", session };
  }

  return {
    status: "ready",
    session,
    accountType,
    activeProfile,
    profiles,
  };
}
