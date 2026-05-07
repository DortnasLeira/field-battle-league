import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Trophy, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth, PROFILE_TYPE_EMOJI, PROFILE_TYPE_LABEL, type ProfileType } from "@/lib/auth";
import { PlayerDashboard } from "@/components/PlayerDashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — PeladaPro" },
      { name: "description", content: "Resumo do seu perfil de jogador, time ou campo." },
    ],
  }),
  component: PerfilHome,
});

function PerfilHome() {
  const { session, loading, activeProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/ligas" });
  }, [loading, session, navigate]);

  if (loading || !session) return null;

  if (!activeProfile) {
    return (
      <Card className="border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">Crie um perfil para começar.</p>
        <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground">
          <Link to="/onboarding">Criar perfil</Link>
        </Button>
      </Card>
    );
  }

  if (activeProfile.type === "player") return <PlayerDashboard profile={activeProfile} isOwner />;
  return <PlaceholderDashboard type={activeProfile.type} />;
}

function PlaceholderDashboard({ type }: { type: ProfileType }) {
  return (
    <Card className="border-dashed border-border bg-card p-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
        {PROFILE_TYPE_EMOJI[type]}
      </div>
      <h2 className="mt-4 font-display text-2xl uppercase tracking-wide">
        Perfil de {PROFILE_TYPE_LABEL[type]}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        O painel específico para {PROFILE_TYPE_LABEL[type]} será configurado em breve.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button asChild variant="outline">
          <Link to="/perfil"><Shield className="mr-2 h-4 w-4" /> Editar perfis</Link>
        </Button>
        <Button asChild className="bg-gradient-primary text-primary-foreground">
          <Link to="/ligas"><Trophy className="mr-2 h-4 w-4" /> Ver ligas</Link>
        </Button>
      </div>
    </Card>
  );
}
