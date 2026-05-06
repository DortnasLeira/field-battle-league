import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, MapPin, Star, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { teams } from "@/lib/mockData";

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
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/buscar"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
      </Button>
      <Card className="border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-surface text-4xl">{team.shield}</div>
          <div className="flex-1">
            <h1 className="font-display text-3xl uppercase tracking-wide">{team.name}</h1>
            <p className="text-sm text-muted-foreground">Capitão: {team.captain}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />{team.city}</Badge>
              <Badge variant="outline"><Star className="mr-1 h-3 w-3 text-primary" />Desde {team.founded}</Badge>
            </div>
          </div>
        </div>
        {(team.preferredDays?.length || team.preferredTimes?.length) && (
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {team.preferredDays?.length && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Dias preferidos</p>
                <p>{team.preferredDays.join(", ")}</p>
              </div>
            )}
            {team.preferredTimes?.length && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Horários preferidos</p>
                <p>{team.preferredTimes.join(", ")}</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
