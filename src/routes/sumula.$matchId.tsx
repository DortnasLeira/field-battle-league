import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, FileSignature, Plus, Trash2, Award, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TeamBadge } from "@/components/TeamBadge";
import { useStore } from "@/lib/store";
import type { MatchCard, MatchGoal } from "@/lib/mockData";

export const Route = createFileRoute("/sumula/$matchId")({
  head: () => ({ meta: [{ title: "Súmula digital — PeladaPro" }] }),
  component: SumulaPage,
});

function SumulaPage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const { matches, teams, fields, currentRefereeId, referees, refereeSignMatch } = useStore();
  const match = matches.find((m) => m.id === matchId);

  const [homeScore, setHomeScore] = useState<string>(match?.homeScore?.toString() ?? "0");
  const [awayScore, setAwayScore] = useState<string>(match?.awayScore?.toString() ?? "0");
  const [goals, setGoals] = useState<MatchGoal[]>(match?.goals ?? []);
  const [cards, setCards] = useState<MatchCard[]>(match?.cards ?? []);

  if (!match) {
    return (
      <Card className="border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">Súmula não encontrada.</p>
        <Button asChild variant="outline" className="mt-3"><Link to="/arbitragem">Voltar</Link></Button>
      </Card>
    );
  }

  const home = teams.find((t) => t.id === match.homeId);
  const away = teams.find((t) => t.id === match.awayId);
  const field = fields.find((f) => f.id === match.fieldId);
  const referee = referees.find((r) => r.id === match.refereeId);
  const isContractedReferee = match.refereeId === currentRefereeId;
  const alreadySigned = match.signedByReferee;

  const sign = () => {
    if (!isContractedReferee) {
      toast.error("Apenas o árbitro contratado pode assinar esta súmula.");
      return;
    }
    const hs = Number(homeScore);
    const as = Number(awayScore);
    if (Number.isNaN(hs) || Number.isNaN(as) || hs < 0 || as < 0) {
      toast.error("Placar inválido.");
      return;
    }
    refereeSignMatch(match.id, { homeScore: hs, awayScore: as, goals, cards });
    toast.success("Súmula assinada. Ranking atualizado.");
    navigate({ to: "/arbitragem" });
  };

  return (
    <div className="space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/arbitragem"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
        </Button>
        <h1 className="font-display text-3xl uppercase tracking-wide flex items-center gap-3">
          <FileSignature className="h-7 w-7 text-referee" /> Súmula digital
        </h1>
        <p className="text-sm text-muted-foreground">
          O placar e estatísticas só atualizam o ranking após a assinatura do árbitro contratado.
        </p>
      </div>

      <Card className="border-referee/30 bg-referee/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-referee" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Árbitro responsável</div>
              <div className="font-semibold">{referee?.name ?? "—"}</div>
            </div>
          </div>
          {alreadySigned ? (
            <Badge variant="outline" className="border-success/40 text-success">Assinada</Badge>
          ) : isContractedReferee ? (
            <Badge variant="outline" className="border-warning/40 text-warning">Aguardando assinatura</Badge>
          ) : (
            <Badge variant="outline" className="border-muted text-muted-foreground"><Lock className="mr-1 h-3 w-3" />Somente leitura</Badge>
          )}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          {new Date(match.date).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })} · {field?.name ?? "—"}
        </div>
      </Card>

      <Card className="border-border bg-card p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="text-center">
            <TeamBadge teamId={match.homeId} size="md" />
            <Input
              type="number"
              min={0}
              value={homeScore}
              disabled={!isContractedReferee || alreadySigned}
              onChange={(e) => setHomeScore(e.target.value)}
              className="mt-3 h-16 text-center text-3xl font-bold"
            />
          </div>
          <div className="font-mono text-2xl text-muted-foreground">×</div>
          <div className="text-center">
            <TeamBadge teamId={match.awayId} size="md" />
            <Input
              type="number"
              min={0}
              value={awayScore}
              disabled={!isContractedReferee || alreadySigned}
              onChange={(e) => setAwayScore(e.target.value)}
              className="mt-3 h-16 text-center text-3xl font-bold"
            />
          </div>
        </div>
      </Card>

      <Card className="border-border bg-card p-5">
        <h2 className="font-display text-sm uppercase tracking-wider">Gols</h2>
        <div className="mt-3 space-y-2">
          {goals.map((g, i) => (
            <div key={i} className="flex items-center gap-2 rounded border border-border bg-surface p-2">
              <Select
                value={g.teamId}
                disabled={!isContractedReferee || alreadySigned}
                onValueChange={(v) => setGoals((arr) => arr.map((x, idx) => (idx === i ? { ...x, teamId: v } : x)))}
              >
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={match.homeId}>{home?.name}</SelectItem>
                  <SelectItem value={match.awayId}>{away?.name}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Jogador"
                value={g.player}
                disabled={!isContractedReferee || alreadySigned}
                onChange={(e) => setGoals((arr) => arr.map((x, idx) => (idx === i ? { ...x, player: e.target.value } : x)))}
              />
              <Input
                type="number"
                min={1}
                placeholder="min"
                value={g.minute || ""}
                disabled={!isContractedReferee || alreadySigned}
                onChange={(e) => setGoals((arr) => arr.map((x, idx) => (idx === i ? { ...x, minute: Number(e.target.value) } : x)))}
                className="w-20"
              />
              <Button
                size="icon"
                variant="ghost"
                disabled={!isContractedReferee || alreadySigned}
                onClick={() => setGoals((arr) => arr.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {(!isContractedReferee || alreadySigned) && goals.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum gol registrado.</p>
          )}
          {isContractedReferee && !alreadySigned && (
            <Button size="sm" variant="outline" onClick={() => setGoals((arr) => [...arr, { teamId: match.homeId, player: "", minute: 0 }])}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar gol
            </Button>
          )}
        </div>
      </Card>

      <Card className="border-border bg-card p-5">
        <h2 className="font-display text-sm uppercase tracking-wider">Cartões</h2>
        <div className="mt-3 space-y-2">
          {cards.map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded border border-border bg-surface p-2">
              <Select
                value={c.teamId}
                disabled={!isContractedReferee || alreadySigned}
                onValueChange={(v) => setCards((arr) => arr.map((x, idx) => (idx === i ? { ...x, teamId: v } : x)))}
              >
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={match.homeId}>{home?.name}</SelectItem>
                  <SelectItem value={match.awayId}>{away?.name}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Jogador"
                value={c.player}
                disabled={!isContractedReferee || alreadySigned}
                onChange={(e) => setCards((arr) => arr.map((x, idx) => (idx === i ? { ...x, player: e.target.value } : x)))}
              />
              <Select
                value={c.type}
                disabled={!isContractedReferee || alreadySigned}
                onValueChange={(v) => setCards((arr) => arr.map((x, idx) => (idx === i ? { ...x, type: v as "yellow" | "red" } : x)))}
              >
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yellow">🟨 Amarelo</SelectItem>
                  <SelectItem value="red">🟥 Vermelho</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                placeholder="min"
                value={c.minute || ""}
                disabled={!isContractedReferee || alreadySigned}
                onChange={(e) => setCards((arr) => arr.map((x, idx) => (idx === i ? { ...x, minute: Number(e.target.value) } : x)))}
                className="w-20"
              />
              <Button
                size="icon"
                variant="ghost"
                disabled={!isContractedReferee || alreadySigned}
                onClick={() => setCards((arr) => arr.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {(!isContractedReferee || alreadySigned) && cards.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum cartão registrado.</p>
          )}
          {isContractedReferee && !alreadySigned && (
            <Button size="sm" variant="outline" onClick={() => setCards((arr) => [...arr, { teamId: match.homeId, player: "", type: "yellow", minute: 0 }])}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar cartão
            </Button>
          )}
        </div>
      </Card>

      {!alreadySigned && isContractedReferee && (
        <div className="sticky bottom-4 z-10">
          <Card className="border-referee/40 bg-card/95 p-4 backdrop-blur shadow-glow-referee">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Assinatura digital</Label>
                <p className="text-xs">Ao assinar, o resultado é oficializado e o ranking de Times e Jogadores é atualizado.</p>
              </div>
              <Button onClick={sign} className="bg-gradient-referee text-background shadow-glow-referee">
                <FileSignature className="mr-1.5 h-4 w-4" /> Assinar súmula
              </Button>
            </div>
          </Card>
        </div>
      )}

      {alreadySigned && (
        <Card className="border-success/40 bg-success/5 p-4 text-sm text-success">
          ✓ Súmula assinada em {match.signedAt ? new Date(match.signedAt).toLocaleString("pt-BR") : "—"}.
        </Card>
      )}
    </div>
  );
}
