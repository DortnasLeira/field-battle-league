import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/hooks/useSubscription";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useServerFn } from "@tanstack/react-start";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "Time PRO — PeladaPro" },
      { name: "description", content: "Selo verificado, troféus oficiais e benefícios para o seu time." },
    ],
  }),
  component: ProPage,
});

const BENEFITS = [
  "Selo de Time Verificado",
  "Troféus oficiais e ranking destacado",
  "Vagas e desafios ilimitados",
  "Prioridade na busca",
  "Suporte prioritário",
];

function ProPage() {
  const { session, activeProfile, profiles } = useAuth();
  const navigate = useNavigate();
  const [openCheckout, setOpenCheckout] = useState(false);
  const [ownedTeams, setOwnedTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamId, setTeamId] = useState<string>("");
  const portalFn = useServerFn(createPortalSession);
  const { sub, isActive, loading } = useSubscription(teamId || undefined);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("team_members")
        .select("team_id, teams(id,name)")
        .eq("user_id", userId)
        .eq("role", "owner");
      const list = (data ?? [])
        .map((r: any) => r.teams)
        .filter(Boolean) as { id: string; name: string }[];
      setOwnedTeams(list);
      if (!teamId && list[0]) setTeamId(list[0].id);
    })();
  }, [session?.user?.id]);

  const teamName = useMemo(
    () => ownedTeams.find((t) => t.id === teamId)?.name ?? "",
    [ownedTeams, teamId],
  );

  const openPortal = async () => {
    try {
      const url = await portalFn({
        data: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir portal");
    }
  };

  if (!session) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <Card className="p-6">
          <p className="mb-4">Entre para assinar o Time PRO.</p>
          <Button onClick={() => navigate({ to: "/auth", search: { redirect: "/pro" } })}>
            Entrar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Crown className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl uppercase tracking-wider">
            Time <span className="text-primary">PRO</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            R$ 14,90/mês — 30 dias grátis para testar
          </p>
        </div>

        {ownedTeams.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="mb-3">Você precisa ser dono de um time para assinar o PRO.</p>
            {profiles.some((p) => p.type === "team") ? (
              <p className="text-sm text-muted-foreground">
                Crie ou seja indicado como dono em um time para continuar.
              </p>
            ) : (
              <Button onClick={() => navigate({ to: "/onboarding" })}>Criar perfil de Time</Button>
            )}
          </Card>
        ) : (
          <Card className="p-6">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">Time:</span>
              <select
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
              >
                {ownedTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {isActive && <Badge className="bg-gradient-primary">PRO ativo</Badge>}
            </div>

            <ul className="mb-6 grid gap-2 sm:grid-cols-2">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 text-primary" /> {b}
                </li>
              ))}
            </ul>

            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isActive ? (
              <div className="flex flex-wrap gap-2">
                <Button onClick={openPortal} variant="outline" className="gap-2">
                  Gerenciar assinatura <ExternalLink className="h-4 w-4" />
                </Button>
                {sub?.cancel_at_period_end && (
                  <Badge variant="outline">
                    Cancelada — acesso até{" "}
                    {sub.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString("pt-BR")
                      : "—"}
                  </Badge>
                )}
              </div>
            ) : !openCheckout ? (
              <Button
                size="lg"
                className="bg-gradient-primary"
                onClick={() => setOpenCheckout(true)}
                disabled={!teamId}
              >
                Assinar PRO para {teamName || "este time"}
              </Button>
            ) : (
              <StripeEmbeddedCheckout priceId="team_pro_monthly" teamId={teamId} />
            )}
          </Card>
        )}

        <p className="mt-6 text-center">
          <Link to="/" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            Voltar
          </Link>
        </p>
      </div>
    </>
  );
}
