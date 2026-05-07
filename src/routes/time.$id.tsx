import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { teams } from "@/lib/mockData";
import { TeamDashboard } from "@/components/TeamDashboard";

export const Route = createFileRoute("/time/$id")({
  head: () => ({ meta: [{ title: "Perfil do Time — PeladaPro" }] }),
  component: TeamPublicPage,
});

function TeamPublicPage() {
  const { id } = Route.useParams();
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth", search: { redirect: `/time/${id}` } });
  }, [id, session, loading, navigate]);

  if (!session) {
    return (
      <Card className="border-border bg-card p-8 text-center">
        <Lock className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Faça login para ver este perfil.</p>
      </Card>
    );
  }

  const team = teams.find((t) => t.id === id);
  if (!team) return <p className="text-sm text-muted-foreground">Time não encontrado.</p>;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/buscar"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar para a busca</Link>
      </Button>
      <TeamDashboard team={team} />
    </div>
  );
}
