import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Lock, MapPin, Star, Calendar, History, Trophy, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PublicTeamDashboard } from "@/components/PublicTeamDashboard";
import { teams as mockTeams, matches as mockMatches, fields as mockFields, type Team } from "@/lib/mockData";
import { cn } from "@/lib/utils";

type TeamRow = {
  id: string;
  name: string;
  shield: string | null;
  city: string | null;
  captain: string | null;
  founded: number | null;
  preferred_days: string[] | null;
  preferred_times: string[] | null;
  verified: boolean | null;
  rating: number | null;
  fair_play: number | null;
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

  const mockTeam = useMemo(() => mockTeams.find((t) => t.id === id) ?? null, [id]);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/auth", search: { redirect: `/time/${id}` } });
      return;
    }
    // UUIDs only — mock IDs like "t1" won't match. Skip DB fetch in that case.
    const looksLikeUuid = /^[0-9a-f]{8}-/i.test(id);
    if (!looksLikeUuid) {
      setFetching(false);
      return;
    }
    supabase
      .from("teams")
      .select("id, name, shield, city, captain, founded, preferred_days, preferred_times, verified, rating, fair_play")
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

  // DB hit
  if (team) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/buscar"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar para a busca</Link>
        </Button>
        <PublicTeamDashboard team={team} />
      </div>
    );
  }

  // Mock fallback
  if (mockTeam) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/buscar"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar para a busca</Link>
        </Button>
        <MockTeamDetails team={mockTeam} />
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">Time não encontrado.</p>;
}

function MockTeamDetails({ team }: { team: Team }) {
  const yr = new Date().getFullYear();
  const teamMatches = useMemo(
    () => mockMatches.filter((m) => m.homeId === team.id || m.awayId === team.id),
    [team.id],
  );
  const completed = teamMatches.filter(
    (m) => m.status === "completed" && m.homeScore != null && m.awayScore != null,
  );
  const stats = useMemo(() => {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    completed.forEach((m) => {
      const home = m.homeId === team.id;
      const my = home ? m.homeScore! : m.awayScore!;
      const opp = home ? m.awayScore! : m.homeScore!;
      gf += my; ga += opp;
      if (my > opp) w++; else if (my < opp) l++; else d++;
    });
    const j = completed.length;
    const pct = j ? Math.round(((w * 3 + d) / (j * 3)) * 100) : 0;
    return { j, w, d, l, gf, ga, sg: gf - ga, pct };
  }, [completed, team.id]);
  const yrPct = useMemo(() => {
    const inYr = completed.filter((m) => new Date(m.date).getFullYear() === yr);
    let w = 0, d = 0;
    inYr.forEach((m) => {
      const home = m.homeId === team.id;
      const my = home ? m.homeScore! : m.awayScore!;
      const opp = home ? m.awayScore! : m.homeScore!;
      if (my > opp) w++; else if (my === opp) d++;
    });
    return inYr.length ? Math.round(((w * 3 + d) / (inYr.length * 3)) * 100) : null;
  }, [completed, team.id, yr]);
  const preferredField = useMemo(() => {
    if (!team.preferredFieldName) return null;
    const needle = team.preferredFieldName.trim().toLowerCase();
    return mockFields.find((f) => f.name.toLowerCase() === needle)
      ?? mockFields.find((f) => f.name.toLowerCase().includes(needle) || needle.includes(f.name.toLowerCase()))
      ?? null;
  }, [team.preferredFieldName]);
  const fieldLabel = preferredField?.name || team.preferredFieldName || "VISITANTE";

  return (
    <div className="space-y-6">
      <Card className="border-border bg-gradient-hero p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-surface text-5xl ring-2 ring-border">
            {team.shield}
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                <Shield className="mr-1 h-3 w-3" /> Time
              </Badge>
              <Badge variant="outline" className="border-border">
                <Calendar className="mr-1 h-3 w-3 text-primary" /> Desde {team.founded}
              </Badge>
            </div>
            <h1 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">{team.name}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {team.city}
              </span>
              {typeof team.rating === "number" && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Star className="h-3.5 w-3.5 fill-current" /> {team.rating.toFixed(1)}
                    {team.reviews ? <span className="text-muted-foreground">({team.reviews})</span> : null}
                  </span>
                </>
              )}
              <span className="text-muted-foreground">·</span>
              <span className={cn(
                "inline-flex items-center gap-1 text-sm",
                team.preferredFieldName ? "text-foreground" : "font-mono text-[11px] uppercase tracking-wider text-primary",
              )}>
                <Star className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">Campo:</span>
                <span className="font-semibold">{fieldLabel}</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <InfoPill label="Capitão" value={team.captain} />
              <InfoPill label={`Aprov. ${yr}`} value={yrPct === null ? "—" : `${yrPct}%`} />
              <InfoPill label="Aprov. geral" value={`${stats.pct}%`} />
              <InfoPill label="Jogos" value={String(stats.j)} />
            </div>
          </div>
        </div>
      </Card>

      <Card className={cn(
        "border-border p-5",
        preferredField ? "bg-gradient-to-br from-primary/10 via-card to-card" : "bg-card",
      )}>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <MapPin className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Campo preferido</div>
            {preferredField ? (
              <>
                <div className="mt-0.5 truncate font-display text-xl uppercase tracking-wide">{preferredField.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {preferredField.address}</span>
                  <span>·</span>
                  <span>{preferredField.surface}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-primary"><Star className="h-3 w-3 fill-current" /> {preferredField.rating.toFixed(1)}</span>
                  <span>·</span>
                  <span className="font-mono">R$ {preferredField.pricePerHour}/h</span>
                </div>
              </>
            ) : team.preferredFieldName ? (
              <div className="mt-0.5 font-display text-xl uppercase tracking-wide">{team.preferredFieldName}</div>
            ) : (
              <>
                <div className="mt-0.5 font-display text-xl uppercase tracking-wide text-primary">VISITANTE</div>
                <p className="mt-1 text-xs text-muted-foreground">Este time joga fora — sem campo fixo de mando.</p>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" /> Estatísticas
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <StatBox label="Jogos" value={stats.j} />
          <StatBox label="V" value={stats.w} accent />
          <StatBox label="E" value={stats.d} />
          <StatBox label="D" value={stats.l} />
          <StatBox label="GP" value={stats.gf} />
          <StatBox label="GC" value={stats.ga} />
          <StatBox label="SG" value={stats.sg > 0 ? `+${stats.sg}` : stats.sg} />
          <StatBox label="Aprov." value={`${stats.pct}%`} />
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Jogos & batalhas recentes
        </h2>
        <div className="mt-4 space-y-2">
          {teamMatches.length === 0 && (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhuma partida registrada.
            </p>
          )}
          {teamMatches.slice(0, 10).map((m) => {
            const home = m.homeId === team.id;
            const opp = mockTeams.find((t) => t.id === (home ? m.awayId : m.homeId));
            const my = home ? m.homeScore : m.awayScore;
            const them = home ? m.awayScore : m.homeScore;
            const result = m.status === "completed" && my != null && them != null
              ? (my > them ? "V" : my < them ? "D" : "E")
              : "·";
            const color = result === "V"
              ? "bg-emerald-500/15 text-emerald-500"
              : result === "D"
                ? "bg-destructive/15 text-destructive"
                : result === "E"
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/10 text-primary";
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-md font-display text-sm font-bold", color)}>
                  {result}
                </div>
                <div className="flex-1 text-sm">
                  <div className="font-semibold">{home ? team.name : opp?.name} vs {home ? opp?.name : team.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {m.status === "completed" ? `${m.homeScore} × ${m.awayScore}` : m.status}
                  </div>
                </div>
                <div className="text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {new Date(m.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface/60 p-2 backdrop-blur">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-3", accent ? "border-primary/30 bg-primary/5" : "border-border bg-surface")}>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("stat-num mt-1 text-2xl font-bold", accent ? "text-gradient-primary" : "text-foreground")}>{value}</div>
    </div>
  );
}
