import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type UserProfile } from "@/lib/auth";
import { PublicPlayerDashboard } from "@/components/PublicPlayerDashboard";

export const Route = createFileRoute("/jogador/$id")({
  head: () => ({ meta: [{ title: "Perfil do Jogador — PeladaPro" }] }),
  component: PlayerPublicPage,
});

function PlayerPublicPage() {
  const { id } = Route.useParams();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<UserProfile | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/auth", search: { redirect: `/jogador/${id}` } });
      return;
    }
    supabase
      .from("user_profiles")
      .select("*")
      .eq("id", id)
      .eq("type", "player")
      .maybeSingle()
      .then(({ data }) => {
        setPlayer((data ?? null) as UserProfile | null);
        setFetching(false);
      });
  }, [id, session, loading, navigate]);

  if (!session) {
    return (
      <Card className="border-border bg-card p-8 text-center">
        <Lock className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Faça login para ver este perfil.</p>
      </Card>
    );
  }

  if (fetching) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!player) return <p className="text-sm text-muted-foreground">Jogador não encontrado.</p>;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/buscar"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar para a busca</Link>
      </Button>
      <PublicPlayerDashboard profile={player} />
    </div>
  );
}
