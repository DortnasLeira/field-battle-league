import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Shield, Calendar, Clock, Edit2, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil do Time — PeladaPro" },
      { name: "description", content: "Estatísticas, ligas, disponibilidade e histórico do seu time." },
    ],
  }),
  component: PerfilPage,
});

const ALL_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const ALL_TIMES = ["08:00", "10:00", "15:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

function PerfilPage() {
  const { teams, currentTeamId, leagues, matches, updateTeamPrefs } = useStore();
  const team = teams.find((t) => t.id === currentTeamId)!;
  const myLeagues = leagues.filter((l) => l.teamIds.includes(currentTeamId));
  const myMatches = matches.filter((m) => m.homeId === currentTeamId || m.awayId === currentTeamId);
  const completed = myMatches.filter((m) => m.status === "completed");

  const [editing, setEditing] = useState(false);
  const [days, setDays] = useState<string[]>(team.preferredDays);
  const [times, setTimes] = useState<string[]>(team.preferredTimes);

  const stats = useMemo(() => {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    completed.forEach((m) => {
      const isHome = m.homeId === currentTeamId;
      const my = isHome ? m.homeScore! : m.awayScore!;
      const opp = isHome ? m.awayScore! : m.homeScore!;
      gf += my; ga += opp;
      if (my > opp) w++; else if (my === opp) d++; else l++;
    });
    const played = completed.length;
    return { w, d, l, played, gf, ga, points: w * 3 + d, pct: played ? Math.round(((w * 3 + d) / (played * 3)) * 100) : 0 };
  }, [completed, currentTeamId]);

  const toggle = (set: string[], setSet: (v: string[]) => void, val: string) =>
    setSet(set.includes(val) ? set.filter((x) => x !== val) : [...set, val]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="relative overflow-hidden border-border bg-gradient-hero p-6 sm:p-8">
        <div className="field-pattern absolute inset-0 opacity-30" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-surface-elevated text-6xl shadow-card ring-1 ring-border">
            {team.shield}
          </div>
          <div className="flex-1">
            <Badge className="mb-2 bg-primary/15 text-primary hover:bg-primary/20">
              <Shield className="mr-1 h-3 w-3" /> Capitão · {team.captain}
            </Badge>
            <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">{team.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{team.city} · Fundado em {team.founded}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {myLeagues.map((l) => (
                <Badge key={l.id} variant="outline" className="border-primary/30 text-primary">{l.name}</Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Pontos" value={stats.points} accent />
        <Stat label="Jogos" value={stats.played} />
        <Stat label="V — E — D" value={`${stats.w}-${stats.d}-${stats.l}`} />
        <Stat label="Aproveitam." value={`${stats.pct}%`} />
        <Stat label="Gols pró" value={stats.gf} />
        <Stat label="Gols contra" value={stats.ga} />
        <Stat label="Saldo" value={(stats.gf - stats.ga > 0 ? "+" : "") + (stats.gf - stats.ga)} />
        <Stat label="Ligas" value={myLeagues.length} />
      </div>

      {/* Disponibilidade */}
      <Card className="border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide">Disponibilidade</h2>
            <p className="text-xs text-muted-foreground">Dias e horários que facilitam o "match" de batalhas.</p>
          </div>
          {editing ? (
            <Button size="sm" className="bg-gradient-primary text-primary-foreground"
              onClick={() => { updateTeamPrefs(currentTeamId, days, times); setEditing(false); toast.success("Preferências salvas."); }}>
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Edit2 className="mr-2 h-4 w-4" /> Editar
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> Dias preferidos
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((d) => {
                const active = days.includes(d);
                return (
                  <button key={d} disabled={!editing}
                    onClick={() => toggle(days, setDays, d)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                      active ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface text-muted-foreground"
                    } ${editing ? "hover:border-primary cursor-pointer" : "cursor-default"}`}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Horários preferidos
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_TIMES.map((t) => {
                const active = times.includes(t);
                return (
                  <button key={t} disabled={!editing}
                    onClick={() => toggle(times, setTimes, t)}
                    className={`stat-num rounded-md border px-3 py-1.5 text-sm font-bold transition ${
                      active ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface text-muted-foreground"
                    } ${editing ? "hover:border-primary cursor-pointer" : "cursor-default"}`}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Histórico */}
      <Card className="border-border bg-card p-6">
        <h2 className="mb-4 font-display text-xl uppercase tracking-wide">Histórico de jogos</h2>
        <div className="space-y-2">
          {completed.length === 0 && <p className="text-sm text-muted-foreground">Nenhum jogo finalizado ainda.</p>}
          {completed.slice().reverse().map((m) => {
            const isHome = m.homeId === currentTeamId;
            const my = isHome ? m.homeScore! : m.awayScore!;
            const opp = isHome ? m.awayScore! : m.homeScore!;
            const result = my > opp ? "V" : my === opp ? "E" : "D";
            const colors = { V: "bg-success/15 text-success border-success/40", E: "bg-warning/15 text-warning border-warning/40", D: "bg-destructive/15 text-destructive border-destructive/40" };
            const oppTeam = teams.find((t) => t.id === (isHome ? m.awayId : m.homeId));
            return (
              <div key={m.id} className="flex items-center justify-between rounded-md bg-surface px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md border font-display font-bold ${colors[result]}`}>{result}</div>
                  <div>
                    <div className="text-sm">vs <span className="font-semibold">{oppTeam?.shield} {oppTeam?.name}</span></div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {new Date(m.date).toLocaleDateString("pt-BR")} · {leagues.find((l) => l.id === m.leagueId)?.name}
                    </div>
                  </div>
                </div>
                <div className="stat-num text-lg font-bold">{my} <span className="text-muted-foreground">×</span> {opp}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={`stat-num mt-1 text-2xl font-bold ${accent ? "text-gradient-primary" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
