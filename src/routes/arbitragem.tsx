import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Check, X, FileSignature, Trophy, Lock, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TeamBadge } from "@/components/TeamBadge";
import { useStore } from "@/lib/store";
import { REFEREE_ACHIEVEMENTS } from "@/lib/refereeAchievements";
import { cn } from "@/lib/utils";
import type { Challenge } from "@/lib/mockData";

export const Route = createFileRoute("/arbitragem")({
  head: () => ({
    meta: [
      { title: "Arbitragem — PeladaPro" },
      { name: "description", content: "Pedidos recebidos e súmulas digitais para arbitrar." },
    ],
  }),
  component: ArbitragemPage,
});

function ArbitragemPage() {
  const { challenges, matches, referees, currentRefereeId, setCurrentReferee, acceptRefereeRequest, declineRefereeRequest } = useStore();

  const myRequests = challenges.filter((c) => c.refereeRequest?.refereeId === currentRefereeId);
  const pending = myRequests.filter((c) => c.refereeRequest?.status === "pending");
  const accepted = myRequests.filter((c) => c.refereeRequest?.status === "accepted");
  const myMatches = matches.filter((m) => m.refereeId === currentRefereeId);
  const toSign = myMatches.filter((m) => !m.signedByReferee);

  const me = referees.find((r) => r.id === currentRefereeId);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl flex items-center gap-3">
            <Award className="h-8 w-8 text-referee" /> Arbitragem
          </h1>
          <p className="text-sm text-muted-foreground">
            Pedidos de contratação, jogos confirmados e súmulas para assinar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Atuando como</span>
          <Select value={currentRefereeId} onValueChange={setCurrentReferee}>
            <SelectTrigger className="min-w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {referees.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.avatar} {r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Section title="Pedidos pendentes" count={pending.length} empty="Nenhum pedido novo. Você está livre.">
        <div className="grid gap-3 md:grid-cols-2">
          {pending.map((c) => (
            <RequestCard
              key={c.id}
              challenge={c}
              onAccept={() => { acceptRefereeRequest(c.id); toast.success("Pedido aceito. Súmula gerada."); }}
              onDecline={() => { declineRefereeRequest(c.id); toast("Pedido recusado."); }}
            />
          ))}
        </div>
      </Section>

      <Section title="Jogos confirmados" count={accepted.length} empty="Nenhum jogo agendado.">
        <div className="grid gap-3 md:grid-cols-2">
          {accepted.map((c) => (
            <ConfirmedCard key={c.id} challenge={c} />
          ))}
        </div>
      </Section>

      <Section title="Súmulas para assinar" count={toSign.length} empty="Tudo em dia. Nenhuma súmula pendente.">
        <div className="grid gap-3 md:grid-cols-2">
          {toSign.map((m) => (
            <Card key={m.id} className="border-referee/30 bg-referee/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TeamBadge teamId={m.homeId} size="sm" />
                  <span className="font-mono text-xs">vs</span>
                  <TeamBadge teamId={m.awayId} size="sm" />
                </div>
                <Badge variant="outline" className="border-warning/40 text-warning">Aguarda súmula</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(m.date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </p>
              <Button asChild className="mt-3 w-full bg-gradient-referee text-background shadow-glow-referee">
                <Link to="/sumula/$matchId" params={{ matchId: m.id }}>
                  <FileSignature className="mr-1.5 h-4 w-4" /> Lançar placar e assinar
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </Section>

      <Card className="border-border bg-card p-6">
        <div>
          <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
            <Trophy className="h-5 w-5 text-referee" /> Conquistas de árbitro
          </h2>
          <p className="text-xs text-muted-foreground">
            {REFEREE_ACHIEVEMENTS.filter((a) => a.unlocked).length} de {REFEREE_ACHIEVEMENTS.length} desbloqueadas
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {REFEREE_ACHIEVEMENTS.map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition",
                a.unlocked ? "border-referee/40 bg-referee/5" : "border-dashed border-border bg-surface/40 opacity-70",
              )}
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl", a.unlocked ? "bg-referee/15" : "bg-muted")}>
                {a.unlocked ? a.emoji : <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  {a.title}
                  {a.unlocked && <CheckCircle2 className="h-3.5 w-3.5 text-referee" />}
                </div>
                <div className="text-[11px] text-muted-foreground">{a.description}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {me && (
        <Card className="border-border bg-surface/50 p-3 text-[11px] text-muted-foreground">
          Demo: você está atuando como <strong className="text-referee">{me.name}</strong>. Use o seletor acima para
          simular outro árbitro.
        </Card>
      )}
    </div>
  );
}

function Section({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="font-display text-lg uppercase tracking-wide">{title}</h2>
        <span className="font-mono text-[11px] text-muted-foreground">({count})</span>
      </div>
      {count === 0 ? (
        <Card className="border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">{empty}</Card>
      ) : (
        children
      )}
    </div>
  );
}

function RequestCard({ challenge, onAccept, onDecline }: { challenge: Challenge; onAccept: () => void; onDecline: () => void }) {
  const { fields } = useStore();
  const field = fields.find((f) => f.id === challenge.fieldId);
  const req = challenge.refereeRequest!;
  return (
    <Card className="border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TeamBadge teamId={challenge.fromTeamId} size="sm" />
          <span className="font-mono text-xs text-muted-foreground">vs</span>
          <TeamBadge teamId={challenge.toTeamId} size="sm" />
        </div>
        <Badge variant="outline" className="border-referee/40 text-referee">R$ {req.pricePerGame}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-border bg-surface p-2">
          <div className="font-mono text-[9px] uppercase text-muted-foreground">Quando</div>
          <div>{new Date(challenge.date).toLocaleDateString("pt-BR")} · {challenge.time}</div>
        </div>
        <div className="rounded border border-border bg-surface p-2">
          <div className="font-mono text-[9px] uppercase text-muted-foreground">Local</div>
          <div className="truncate">{field?.name ?? "—"}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onDecline}>
          <X className="mr-1 h-4 w-4" /> Recusar
        </Button>
        <Button size="sm" className="flex-1 bg-gradient-referee text-background shadow-glow-referee" onClick={onAccept}>
          <Check className="mr-1 h-4 w-4" /> Aceitar
        </Button>
      </div>
    </Card>
  );
}

function ConfirmedCard({ challenge }: { challenge: Challenge }) {
  const { fields } = useStore();
  const field = fields.find((f) => f.id === challenge.fieldId);
  const req = challenge.refereeRequest!;
  return (
    <Card className="border-success/30 bg-success/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TeamBadge teamId={challenge.fromTeamId} size="sm" />
          <span className="font-mono text-xs text-muted-foreground">vs</span>
          <TeamBadge teamId={challenge.toTeamId} size="sm" />
        </div>
        <Badge variant="outline" className="border-success/40 text-success">Confirmado</Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {new Date(challenge.date).toLocaleDateString("pt-BR")} · {challenge.time} · {field?.name}
      </p>
      {req.matchId && (
        <Button asChild size="sm" variant="outline" className="mt-3 w-full border-referee/40 text-referee hover:bg-referee/10">
          <Link to="/sumula/$matchId" params={{ matchId: req.matchId }}>
            <FileSignature className="mr-1.5 h-4 w-4" /> Abrir súmula
          </Link>
        </Button>
      )}
    </Card>
  );
}
