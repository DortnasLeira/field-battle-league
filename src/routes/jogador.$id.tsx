import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, frameClass, type UserProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";

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

  const initials = (player.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/buscar"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
      </Button>
      <Card className="border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div
            className={cn("flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl text-2xl", frameClass(player.frame))}
            style={{ background: player.color + "22", color: player.color }}
          >
            {player.photo_url ? (
              <img src={player.photo_url} alt={player.name} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display">{initials || player.avatar || "⚽"}</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-3xl uppercase tracking-wide">{player.name}</h1>
            {player.nickname && <p className="text-sm text-muted-foreground">"{player.nickname}"</p>}
            <div className="mt-2 flex flex-wrap gap-1">
              {player.position && <Badge variant="outline" className="border-primary/40 text-primary">{player.position}</Badge>}
              {player.level && <Badge variant="outline">{player.level}</Badge>}
              {player.preferred_foot && <Badge variant="outline">Pé {player.preferred_foot}</Badge>}
            </div>
            {player.city && (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <MapPin className="mr-0.5 inline h-3 w-3" /> {player.city}
              </p>
            )}
          </div>
        </div>
        {player.bio && <p className="mt-4 text-sm text-muted-foreground">{player.bio}</p>}
      </Card>
    </div>
  );
}
