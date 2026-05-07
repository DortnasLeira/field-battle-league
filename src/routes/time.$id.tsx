import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PublicTeamDashboard } from "@/components/PublicTeamDashboard";

type TeamRow = {
  id: string;
  name: string;
  shield: string | null;
  city: string | null;
  captain: string | null;
  founded: number | null;
  preferred_days: string[] | null;
  preferred_times: string[] | null;
};

export const Route = createFileRoute("/time/$id")({
  head: () => ({ meta: [{ title: "Perfil do Time — PeladaPro" }] }),
  component: TeamPublicPage,
});

function TeamPublicPage() {
  const { id } = Route.useParams();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/auth", search: { redirect: `/time/${id}` } });
      return;
    }
    supabase
      .from("teams")
      .select("id, name, shield, city, captain, founded, preferred_days, preferred_times")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setTeam((data ?? null) as TeamRow | null);
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
  if (!team) return <p className="text-sm text-muted-foreground">Time não encontrado.</p>;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/buscar"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar para a busca</Link>
      </Button>
      <PublicTeamDashboard team={team} />
    </div>
  );
}
