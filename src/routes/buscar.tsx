import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Users, User, MapPin, Star, Eye, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FiltersPanel } from "@/components/FiltersPanel";
import { TeamBadge } from "@/components/TeamBadge";
import { teams as mockTeams, type Team } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, frameClass, type UserProfile } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/buscar")({
  head: () => ({
    meta: [
      { title: "Buscar — PeladaPro" },
      { name: "description", content: "Procure times e jogadores na sua região." },
    ],
  }),
  component: BuscarPage,
});

type Kind = "all" | "players" | "teams";

const ALL_POSITIONS = ["Goleiro", "Zagueiro", "Lateral", "Volante", "Meia", "Atacante"];
const ALL_LEVELS = ["Iniciante", "Intermediário", "Avançado"];

function BuscarPage() {
  const [kind, setKind] = useState<Kind>("all");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [position, setPosition] = useState<string>("");
  const [level, setLevel] = useState<string>("");

  const [players, setPlayers] = useState<UserProfile[]>([]);
  const { session } = useAuth();
  const navigate = useNavigate();
  const [viewPlayer, setViewPlayer] = useState<UserProfile | null>(null);
  const [viewTeam, setViewTeam] = useState<Team | null>(null);
  const requireLogin = () => {
    toast.error("Faça login para ver o perfil.");
    navigate({ to: "/auth" });
  };

  useEffect(() => {
    supabase
      .from("user_profiles")
      .select("*")
      .eq("type", "player")
      .then(({ data }) => setPlayers((data ?? []) as UserProfile[]));
  }, []);

  const q = query.trim().toLowerCase();

  const filteredTeams = useMemo(() => {
    return mockTeams.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q) && !t.captain.toLowerCase().includes(q)) return false;
      if (city && !t.city.toLowerCase().includes(city.toLowerCase())) return false;
      return true;
    });
  }, [q, city]);

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const nick = (p.nickname || "").toLowerCase();
      if (q && !name.includes(q) && !nick.includes(q)) return false;
      if (city && !(p.city || "").toLowerCase().includes(city.toLowerCase())) return false;
      if (position && p.position !== position) return false;
      if (level && p.level !== level) return false;
      return true;
    });
  }, [players, q, city, position, level]);

  const filterCount = [city, position, level].filter(Boolean).length;
  const clear = () => {
    setCity("");
    setPosition("");
    setLevel("");
  };

  const showTeams = kind === "all" || kind === "teams";
  const showPlayers = kind === "all" || kind === "players";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">Buscar</h1>
        <p className="text-sm text-muted-foreground">Encontre times e jogadores pelo nome.</p>
      </div>

      <Card className="border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite o nome do jogador ou time..."
              className="pl-9"
            />
          </div>
          <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
            <TabsList>
              <TabsTrigger value="all">Tudo</TabsTrigger>
              <TabsTrigger value="players"><User className="mr-1 h-3.5 w-3.5" /> Jogadores</TabsTrigger>
              <TabsTrigger value="teams"><Users className="mr-1 h-3.5 w-3.5" /> Times</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-3">
          <FiltersPanel count={filterCount} onClear={clear}>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Cidade</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: São Paulo" className="mt-1" />
              </div>
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Posição</Label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Todas</option>
                  {ALL_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Nível</Label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Todos</option>
                  {ALL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Posição e nível aplicam-se apenas a jogadores.
            </p>
          </FiltersPanel>
        </div>
      </Card>

      {showPlayers && (
        <section>
          <SectionHeader icon={<User className="h-4 w-4" />} title="Jogadores" count={filteredPlayers.length} />
          {filteredPlayers.length === 0 ? (
            <EmptyState text="Nenhum jogador encontrado." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPlayers.map((p) => <PlayerCard key={p.id} p={p} />)}
            </div>
          )}
        </section>
      )}

      {showTeams && (
        <section>
          <SectionHeader icon={<Users className="h-4 w-4" />} title="Times" count={filteredTeams.length} />
          {filteredTeams.length === 0 ? (
            <EmptyState text="Nenhum time encontrado." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTeams.map((t) => (
                <Card key={t.id} className="flex items-center gap-3 border-border bg-card p-4">
                  <TeamBadge teamId={t.id} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base uppercase tracking-wide truncate">{t.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                      <MapPin className="mr-0.5 inline h-3 w-3" /> {t.city} · Cap. {t.captain}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Star className="h-3 w-3 text-primary" /> Desde {t.founded}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/vagas">Vagas</Link>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function PlayerCard({ p }: { p: UserProfile }) {
  const initials = (p.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <Card className="flex items-center gap-3 border-border bg-card p-4">
      <div
        className={cn("flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl text-xl", frameClass(p.frame))}
        style={{ background: p.color + "22", color: p.color }}
      >
        {p.photo_url ? (
          <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
        ) : (
          <span className="font-display">{initials || p.avatar || "⚽"}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-base uppercase tracking-wide truncate">{p.name}</div>
        {p.nickname && <div className="text-xs text-muted-foreground truncate">"{p.nickname}"</div>}
        <div className="mt-1 flex flex-wrap gap-1">
          {p.position && <Badge variant="outline" className="border-primary/40 text-primary">{p.position}</Badge>}
          {p.level && <Badge variant="outline" className="border-border">{p.level}</Badge>}
        </div>
        {p.city && (
          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <MapPin className="mr-0.5 inline h-3 w-3" /> {p.city}
          </div>
        )}
      </div>
    </Card>
  );
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon}
      <h2 className="font-display text-lg uppercase tracking-wide">{title}</h2>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">({count})</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
      {text}
    </Card>
  );
}
