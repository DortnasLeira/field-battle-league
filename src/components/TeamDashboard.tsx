import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Trophy, Calendar, MapPin, Star, History, Shield, Users, Lock, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { TeamBadge } from "@/components/TeamBadge";
import { TEAM_ACHIEVEMENTS } from "@/lib/teamAchievements";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/mockData";

export function TeamDashboard({ team }: { team: Team }) {
  const { matches, fields } = useStore();

  const teamMatches = useMemo(
    () => matches.filter((m) => m.homeId === team.id || m.awayId === team.id),
    [matches, team.id],
  );
  const completed = teamMatches.filter((m) => m.status === "completed");
  const upcoming = teamMatches
    .filter((m) => m.status === "scheduled" || m.status === "awaiting_score")
    .slice(0, 4);

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
    const pct = j ? Math.round((w * 3 + d) / (j * 3) * 100) : 0;
    return { j, w, d, l, gf, ga, sg: gf - ga, pct };
  }, [completed, team.id]);

  return (
    <div className="space-y-6">
      <Card className="border-border bg-gradient-hero p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-surface text-5xl ring-2 ring-border">
            {team.shield}
            <span
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-sm shadow-glow"
              title="Time"
            >
              🛡️
            </span>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                <Shield className="mr-1 h-3 w-3" /> Time
              </Badge>
              <Badge variant="outline" className="border-border text-emerald-500">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ativo
              </Badge>
              <Badge variant="outline" className="border-border">
                <Star className="mr-1 h-3 w-3 text-primary" /> Desde {team.founded}
              </Badge>
            </div>

            <h1 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">{team.name}</h1>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <InfoPill label="Cidade" value={team.city} />
              <InfoPill label="Capitão" value={team.captain} />
              <InfoPill label="Dias" value={team.preferredDays?.join(", ") || "—"} />
              <InfoPill label="Horários" value={team.preferredTimes?.join(", ") || "—"} />
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" /> Estatísticas
        </h2>
        <p className="text-xs text-muted-foreground">Histórico geral</p>
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
          <Users className="h-5 w-5 text-primary" /> Elenco
        </h2>
        <p className="text-xs text-muted-foreground">Membros do time aparecerão aqui em breve.</p>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Histórico de partidas
        </h2>
        <p className="text-xs text-muted-foreground">Placares (somente leitura)</p>
        <div className="mt-4 space-y-2">
          {completed.length === 0 && <EmptyLine text="Sem partidas registradas." />}
          {completed.slice(-8).reverse().map((m) => {
            const home = m.homeId === team.id;
            const my = home ? m.homeScore! : m.awayScore!;
            const opp = home ? m.awayScore! : m.homeScore!;
            const result = my > opp ? "V" : my < opp ? "D" : "E";
            const color = result === "V" ? "bg-emerald-500/15 text-emerald-500" : result === "D" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground";
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-md font-display text-sm font-bold", color)}>{result}</div>
                <div className="flex flex-1 items-center gap-3">
                  <TeamBadge teamId={m.homeId} size="sm" />
                  <span className="stat-num text-base font-bold">{m.homeScore} × {m.awayScore}</span>
                  <TeamBadge teamId={m.awayId} size="sm" />
                </div>
                <div className="text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {new Date(m.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Próximos jogos
        </h2>
        <div className="mt-4 space-y-3">
          {upcoming.length === 0 && <EmptyLine text="Nenhum jogo agendado." />}
          {upcoming.map((m) => {
            const field = fields.find((f) => f.id === m.fieldId);
            return (
              <div key={m.id} className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <TeamBadge teamId={m.homeId} size="sm" />
                  <span className="font-mono text-xs text-muted-foreground">VS</span>
                  <TeamBadge teamId={m.awayId} size="sm" />
                </div>
                <div className="text-right text-xs">
                  <div className="font-display text-sm uppercase">
                    {new Date(m.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                    {" · "}
                    {new Date(m.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {field && (
                    <div className="font-mono text-muted-foreground">
                      <MapPin className="inline h-3 w-3" /> {field.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" /> Conquistas do time
            </h2>
            <p className="text-xs text-muted-foreground">
              {TEAM_ACHIEVEMENTS.filter((a) => a.unlocked).length} de {TEAM_ACHIEVEMENTS.length} desbloqueadas
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TEAM_ACHIEVEMENTS.map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition",
                a.unlocked ? "border-primary/30 bg-primary/5" : "border-dashed border-border bg-surface/40 opacity-70",
              )}
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl", a.unlocked ? "bg-primary/15" : "bg-muted")}>
                {a.unlocked ? a.emoji : <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  {a.title}
                  {a.unlocked && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                </div>
                <div className="text-[11px] text-muted-foreground">{a.description}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        <Link to="/buscar" className="underline">← Voltar para a busca</Link>
      </p>
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

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</p>;
}
