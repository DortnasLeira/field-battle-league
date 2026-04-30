import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trophy, Users, Calendar, Plus, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TeamBadge } from "@/components/TeamBadge";
import { computeStandings, useStore } from "@/lib/store";

export const Route = createFileRoute("/ligas")({
  head: () => ({
    meta: [
      { title: "Ligas e Ranking — PeladaPro" },
      { name: "description", content: "Tabela de classificação, inscrições em ligas regionais e validação de placares." },
    ],
  }),
  component: LigasPage,
});

function LigasPage() {
  const { leagues, matches, currentTeamId, joinLeague, leaveLeague, teams, submitScore, validateScore } = useStore();
  const [activeLeague, setActiveLeague] = useState(leagues[0]?.id ?? "");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">Ligas & Ranking</h1>
          <p className="text-sm text-muted-foreground">Inscreva seu time, acompanhe a tabela e valide resultados.</p>
        </div>
        <CreateLeagueDialog />
      </div>

      <Tabs value={activeLeague} onValueChange={setActiveLeague}>
        <TabsList className="h-auto flex-wrap bg-surface p-1">
          {leagues.map((l) => (
            <TabsTrigger
              key={l.id}
              value={l.id}
              className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow"
            >
              <Trophy className="mr-2 h-3.5 w-3.5" />
              {l.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {leagues.map((league) => {
          const standings = computeStandings(league.id, matches, league.teamIds);
          const isJoined = league.teamIds.includes(currentTeamId);
          const leagueMatches = matches.filter((m) => m.leagueId === league.id);
          const pending = leagueMatches.filter(
            (m) =>
              (m.status === "awaiting_score" || m.status === "awaiting_validation") &&
              (m.homeId === currentTeamId || m.awayId === currentTeamId),
          );

          return (
            <TabsContent key={league.id} value={league.id} className="space-y-6">
              {/* Header info */}
              <Card className="border-border bg-card p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-display text-2xl uppercase">{league.name}</h2>
                    <p className="text-sm text-muted-foreground">{league.region} · Temporada {league.season}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline"><Users className="mr-1 h-3 w-3" />{league.teamIds.length} times</Badge>
                      <Badge variant="outline"><Calendar className="mr-1 h-3 w-3" />Início {new Date(league.startDate).toLocaleDateString("pt-BR")}</Badge>
                    </div>
                  </div>
                  {isJoined ? (
                    <Button variant="outline" onClick={() => { leaveLeague(league.id, currentTeamId); toast.success("Time removido da liga."); }}>
                      Sair da liga
                    </Button>
                  ) : (
                    <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                      onClick={() => { joinLeague(league.id, currentTeamId); toast.success(`${teams.find(t=>t.id===currentTeamId)?.name} inscrito!`); }}>
                      <Plus className="mr-2 h-4 w-4" /> Inscrever meu time
                    </Button>
                  )}
                </div>
              </Card>

              {/* Pending placar */}
              {pending.length > 0 && (
                <Card className="border-accent/40 bg-accent/5 p-6">
                  <h3 className="mb-4 font-display text-lg uppercase tracking-wide text-accent">⚠ Placares pendentes</h3>
                  <div className="space-y-3">
                    {pending.map((m) => (
                      <PendingMatchRow key={m.id} matchId={m.id} onSubmit={submitScore} onValidate={validateScore} />
                    ))}
                  </div>
                </Card>
              )}

              {/* Standings table */}
              <Card className="border-border bg-card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border bg-surface">
                      <tr className="text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-3 py-3 text-center">P</th>
                        <th className="px-3 py-3 text-center">J</th>
                        <th className="px-3 py-3 text-center">V</th>
                        <th className="px-3 py-3 text-center">E</th>
                        <th className="px-3 py-3 text-center">D</th>
                        <th className="px-3 py-3 text-center">GP</th>
                        <th className="px-3 py-3 text-center">GC</th>
                        <th className="px-3 py-3 text-center">SG</th>
                        <th className="px-3 py-3 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {standings.map((row, i) => {
                        const isMe = row.teamId === currentTeamId;
                        const zone = i === 0 ? "border-l-4 border-l-primary" : i < 4 ? "border-l-4 border-l-success/60" : "";
                        return (
                          <tr key={row.teamId} className={`${isMe ? "bg-primary/5" : "hover:bg-surface/60"} ${zone}`}>
                            <td className="px-4 py-3">
                              <span className="font-display text-lg font-bold text-foreground">{i + 1}</span>
                            </td>
                            <td className="px-4 py-3"><TeamBadge teamId={row.teamId} size="sm" /></td>
                            <td className="px-3 py-3 text-center"><span className="stat-num text-base font-bold text-primary">{row.points}</span></td>
                            <td className="px-3 py-3 text-center stat-num">{row.played}</td>
                            <td className="px-3 py-3 text-center stat-num text-success">{row.wins}</td>
                            <td className="px-3 py-3 text-center stat-num">{row.draws}</td>
                            <td className="px-3 py-3 text-center stat-num text-destructive">{row.losses}</td>
                            <td className="px-3 py-3 text-center stat-num">{row.goalsFor}</td>
                            <td className="px-3 py-3 text-center stat-num">{row.goalsAgainst}</td>
                            <td className="px-3 py-3 text-center stat-num">{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</td>
                            <td className="px-3 py-3 text-right stat-num text-muted-foreground">{row.pct}%</td>
                          </tr>
                        );
                      })}
                      {standings.length === 0 && (
                        <tr><td colSpan={11} className="p-8 text-center text-sm text-muted-foreground">Sem times inscritos ainda.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-4 border-t border-border bg-surface px-4 py-3 text-[11px] text-muted-foreground">
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-primary"></span>Líder</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-success/60"></span>Zona de classificação</span>
                  <span>Critérios: Pontos · Vitórias · Saldo · Gols pró</span>
                </div>
              </Card>

              {/* Recent results */}
              <Card className="border-border bg-card p-6">
                <h3 className="mb-4 font-display text-lg uppercase tracking-wide">Últimos resultados</h3>
                <div className="space-y-2">
                  {leagueMatches.filter((m) => m.status === "completed").slice(-5).reverse().map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-md bg-surface px-4 py-3">
                      <div className="flex flex-1 items-center justify-end gap-3">
                        <TeamBadge teamId={m.homeId} size="sm" />
                      </div>
                      <div className="mx-4 flex items-center gap-2 font-mono text-xl font-bold">
                        <span className={m.homeScore! > m.awayScore! ? "text-primary" : ""}>{m.homeScore}</span>
                        <span className="text-muted-foreground">×</span>
                        <span className={m.awayScore! > m.homeScore! ? "text-primary" : ""}>{m.awayScore}</span>
                      </div>
                      <div className="flex flex-1 items-center gap-3">
                        <TeamBadge teamId={m.awayId} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function PendingMatchRow({ matchId, onSubmit, onValidate }: {
  matchId: string;
  onSubmit: (id: string, home: number, away: number, by: string) => void;
  onValidate: (id: string) => void;
}) {
  const { matches, currentTeamId, fields, rejectScore } = useStore();
  const m = matches.find((x) => x.id === matchId)!;
  const field = fields.find((f) => f.id === m.fieldId);
  const [home, setHome] = useState(m.homeScore?.toString() ?? "");
  const [away, setAway] = useState(m.awayScore?.toString() ?? "");

  const isWaitingMyValidation = m.status === "awaiting_validation" && m.scoreSubmittedBy !== currentTeamId;
  const submittedByMe = m.status === "awaiting_validation" && m.scoreSubmittedBy === currentTeamId;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <TeamBadge teamId={m.homeId} size="sm" />
        {m.status === "awaiting_score" ? (
          <div className="flex items-center gap-2">
            <Input className="w-14 text-center stat-num" value={home} onChange={(e) => setHome(e.target.value.replace(/\D/g, ""))} />
            <span className="text-muted-foreground">×</span>
            <Input className="w-14 text-center stat-num" value={away} onChange={(e) => setAway(e.target.value.replace(/\D/g, ""))} />
          </div>
        ) : (
          <div className="flex items-center gap-2 stat-num text-2xl font-bold">
            <span>{m.homeScore}</span><span className="text-muted-foreground">×</span><span>{m.awayScore}</span>
          </div>
        )}
        <TeamBadge teamId={m.awayId} size="sm" />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{new Date(m.date).toLocaleString("pt-BR")} · {field?.name}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {m.status === "awaiting_score" && (
          <Button size="sm" className="bg-gradient-primary text-primary-foreground"
            onClick={() => {
              const h = parseInt(home), a = parseInt(away);
              if (isNaN(h) || isNaN(a)) return toast.error("Informe o placar.");
              onSubmit(matchId, h, a, currentTeamId);
              toast.success("Placar enviado. Aguardando validação do adversário.");
            }}>
            Enviar placar
          </Button>
        )}
        {submittedByMe && (
          <Badge variant="outline" className="border-warning/40 text-warning">⏳ Aguardando validação adversária</Badge>
        )}
        {isWaitingMyValidation && (
          <>
            <Button size="sm" variant="outline" onClick={() => { rejectScore(matchId); toast("Placar contestado."); }}>Contestar</Button>
            <Button size="sm" className="bg-success text-success-foreground hover:opacity-90"
              onClick={() => { onValidate(matchId); toast.success("Placar validado! Pontos computados."); }}>
              <Check className="mr-1 h-3.5 w-3.5" /> Validar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function CreateLeagueDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Criar nova liga</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Criar nova liga</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Liga Sul 2026" /></div>
          <div><Label>Região</Label><Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Ex: Zona Sul — SP" /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => { toast.success(`Liga "${name}" criada (demo).`); setOpen(false); setName(""); setRegion(""); }}
            className="bg-gradient-primary text-primary-foreground" disabled={!name || !region}>
            Criar liga
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
