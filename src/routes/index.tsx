import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, Calendar, Flame, MapPin, Swords, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TeamBadge } from "@/components/TeamBadge";
import { computeStandings, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PeladaPro — Painel do Capitão" },
      { name: "description", content: "Resumo do seu time: próximos jogos, desafios pendentes e posição na liga." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { currentTeamId, teams, leagues, matches, challenges, fields } = useStore();
  const myTeam = teams.find((t) => t.id === currentTeamId)!;

  const myLeagues = leagues.filter((l) => l.teamIds.includes(currentTeamId));
  const myMatches = matches.filter((m) => m.homeId === currentTeamId || m.awayId === currentTeamId);
  const upcoming = myMatches.filter((m) => m.status === "scheduled" || m.status === "awaiting_score").slice(0, 3);
  const pendingChallenges = challenges.filter((c) => c.toTeamId === currentTeamId && c.status === "pending");

  const myRank = useMemo(() => {
    const league = myLeagues[0];
    if (!league) return null;
    const standings = computeStandings(league.id, matches, league.teamIds);
    const idx = standings.findIndex((r) => r.teamId === currentTeamId);
    return idx >= 0 ? { league, position: idx + 1, row: standings[idx], total: standings.length } : null;
  }, [myLeagues, matches, currentTeamId]);

  const stats = useMemo(() => {
    const completed = myMatches.filter((m) => m.status === "completed");
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    completed.forEach((m) => {
      const isHome = m.homeId === currentTeamId;
      const my = isHome ? m.homeScore! : m.awayScore!;
      const opp = isHome ? m.awayScore! : m.homeScore!;
      gf += my; ga += opp;
      if (my > opp) w++; else if (my === opp) d++; else l++;
    });
    return { w, d, l, played: completed.length, gf, ga, points: w * 3 + d };
  }, [myMatches, currentTeamId]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-hero p-6 sm:p-10">
        <div className="field-pattern absolute inset-0 opacity-40" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-surface-elevated text-5xl shadow-card ring-1 ring-border">
              {myTeam.shield}
            </div>
            <div>
              <Badge className="mb-2 bg-primary/15 text-primary hover:bg-primary/20">Capitão · {myTeam.captain}</Badge>
              <h1 className="font-display text-3xl uppercase tracking-wide text-foreground sm:text-5xl">
                {myTeam.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {myTeam.city} · Fundado em {myTeam.founded} · {myLeagues.length} liga(s) ativa(s)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              <Link to="/campos"><MapPin className="mr-2 h-4 w-4" />Reservar campo</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/desafios"><Swords className="mr-2 h-4 w-4" />Lançar batalha</Link>
            </Button>
          </div>
        </div>

        <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Pontos" value={stats.points} accent />
          <StatTile label="V — E — D" value={`${stats.w}-${stats.d}-${stats.l}`} />
          <StatTile label="Saldo" value={(stats.gf - stats.ga > 0 ? "+" : "") + (stats.gf - stats.ga)} />
          <StatTile label="Aproveitam." value={stats.played ? `${Math.round((stats.points / (stats.played * 3)) * 100)}%` : "—"} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Próximos jogos */}
        <Card className="lg:col-span-2 border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl uppercase tracking-wide">Próximos jogos</h2>
              <p className="text-xs text-muted-foreground">Confrontos agendados e pendências de placar</p>
            </div>
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-3">
            {upcoming.length === 0 && (
              <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum jogo marcado. Que tal lançar uma batalha?
              </p>
            )}
            {upcoming.map((m) => {
              const field = fields.find((f) => f.id === m.fieldId);
              return (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center gap-4">
                    <TeamBadge teamId={m.homeId} size="sm" />
                    <span className="font-mono text-xs text-muted-foreground">VS</span>
                    <TeamBadge teamId={m.awayId} size="sm" />
                  </div>
                  <div className="text-right">
                    <div className="font-display text-sm uppercase">{new Date(m.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}</div>
                    <div className="font-mono text-xs text-muted-foreground">{new Date(m.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {field?.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Posição na liga */}
        <Card className="border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl uppercase tracking-wide">Sua posição</h2>
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          {myRank ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-gradient-surface p-5 ring-1 ring-border">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{myRank.league.name}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="stat-num text-5xl font-bold text-gradient-primary">{myRank.position}º</span>
                  <span className="text-sm text-muted-foreground">de {myRank.total}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <MiniStat label="PTS" value={myRank.row.points} />
                  <MiniStat label="J" value={myRank.row.played} />
                  <MiniStat label="%" value={`${myRank.row.pct}%`} />
                </div>
              </div>
              <Button asChild variant="ghost" className="w-full justify-between">
                <Link to="/ligas">Ver tabela completa <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Inscreva seu time em uma liga para começar.</p>
          )}
        </Card>
      </div>

      {/* Desafios pendentes */}
      <Card className="border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide">Batalhas pendentes</h2>
            <p className="text-xs text-muted-foreground">Times que querem te enfrentar</p>
          </div>
          <Flame className="h-5 w-5 text-accent" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {pendingChallenges.length === 0 && (
            <p className="col-span-full rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum desafio aguardando. Suas defesas estão limpas.
            </p>
          )}
          {pendingChallenges.map((c) => {
            const field = fields.find((f) => f.id === c.fieldId);
            return (
              <div key={c.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="mb-3 flex items-center justify-between">
                  <TeamBadge teamId={c.fromTeamId} size="sm" />
                  <Badge variant="outline" className="border-accent/40 text-accent">desafiou você</Badge>
                </div>
                <p className="mb-3 text-sm italic text-muted-foreground">"{c.message}"</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground">{c.date} · {c.time}</span>
                  <span className="text-muted-foreground">{field?.name}</span>
                </div>
                <Button asChild className="mt-3 w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
                  <Link to="/desafios">Responder</Link>
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-primary/30 bg-primary/5" : "border-border bg-surface"}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={`stat-num mt-1 text-3xl font-bold ${accent ? "text-gradient-primary" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-surface-elevated px-2 py-2">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="stat-num text-base font-bold">{value}</div>
    </div>
  );
}
