import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Swords, Inbox, Send, Check, X, Flame, Award, Gavel } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { TeamBadge } from "@/components/TeamBadge";
import { useStore } from "@/lib/store";
import { FiltersPanel } from "@/components/FiltersPanel";
import type { Challenge, Referee } from "@/lib/mockData";
import { REFEREE_TIER_INFO } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/desafios")({
  head: () => ({
    meta: [
      { title: "Batalhas — PeladaPro" },
      { name: "description", content: "Desafios entre times: enviados, recebidos e aceitos." },
    ],
  }),
  component: DesafiosPage,
});

function DesafiosPage() {
  const { challenges, currentTeamId } = useStore();
  const [fStatus, setFStatus] = useState<string>("all");
  const [fDate, setFDate] = useState("");
  const [fTimeFrom, setFTimeFrom] = useState("");
  const [fTimeTo, setFTimeTo] = useState("");

  const apply = (c: Challenge) => {
    if (fStatus !== "all" && c.status !== fStatus) return false;
    if (fDate && c.date !== fDate) return false;
    if (fTimeFrom && c.time < fTimeFrom) return false;
    if (fTimeTo && c.time > fTimeTo) return false;
    return true;
  };

  const received = challenges.filter((c) => c.toTeamId === currentTeamId && c.status === "pending").filter(apply);
  const sent = challenges.filter((c) => c.fromTeamId === currentTeamId).filter(apply);
  const accepted = challenges.filter((c) =>
    (c.fromTeamId === currentTeamId || c.toTeamId === currentTeamId) && c.status === "accepted",
  ).filter(apply);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl flex items-center gap-3">
            <Swords className="h-8 w-8 text-primary" /> Batalhas
          </h1>
          <p className="text-sm text-muted-foreground">Desafios pendentes, lançados e confrontos confirmados.</p>
        </div>
      </div>

      <FiltersPanel
        count={[fStatus !== "all", fDate, fTimeFrom, fTimeTo].filter(Boolean).length}
        onClear={() => { setFStatus("all"); setFDate(""); setFTimeFrom(""); setFTimeTo(""); }}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="accepted">Aceito</SelectItem>
              <SelectItem value="declined">Recusado</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} title="Data" />
          <Input type="time" value={fTimeFrom} onChange={(e) => setFTimeFrom(e.target.value)} title="Horário a partir de" />
          <Input type="time" value={fTimeTo} onChange={(e) => setFTimeTo(e.target.value)} title="Horário até" />
        </div>
      </FiltersPanel>

      <Tabs defaultValue="received">
        <TabsList className="bg-surface">
          <TabsTrigger value="received" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-glow">
            <Inbox className="mr-2 h-4 w-4" /> Recebidos
            {received.length > 0 && <span className="ml-2 rounded-full bg-background/20 px-1.5 text-[10px] font-bold">{received.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="sent" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-glow">
            <Send className="mr-2 h-4 w-4" /> Enviados
          </TabsTrigger>
          <TabsTrigger value="accepted" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-glow">
            <Flame className="mr-2 h-4 w-4" /> Confirmados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-6">
          <ChallengeGrid items={received} mode="received" empty="Nenhum desafio recebido. Sua defesa está limpa." />
        </TabsContent>
        <TabsContent value="sent" className="mt-6">
          <ChallengeGrid items={sent} mode="sent" empty="Você ainda não desafiou ninguém. Vá pra Buscar Campo e provoque." />
        </TabsContent>
        <TabsContent value="accepted" className="mt-6">
          <ChallengeGrid items={accepted} mode="accepted" empty="Sem batalhas marcadas no momento." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChallengeGrid({ items, mode, empty }: { items: Challenge[]; mode: "received" | "sent" | "accepted"; empty: string }) {
  if (items.length === 0) {
    return (
      <Card className="border-dashed border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">{empty}</p>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((c) => <ChallengeCard key={c.id} challenge={c} mode={mode} />)}
    </div>
  );
}

function ChallengeCard({ challenge, mode }: { challenge: Challenge; mode: "received" | "sent" | "accepted" }) {
  const { fields, currentTeamId, acceptChallenge, declineChallenge } = useStore();
  const field = fields.find((f) => f.id === challenge.fieldId);
  const otherId = challenge.fromTeamId === currentTeamId ? challenge.toTeamId : challenge.fromTeamId;
  const isCreator = challenge.fromTeamId === currentTeamId;
  const [refOpen, setRefOpen] = useState(false);

  const statusConfig = {
    pending: { label: "Pendente", className: "border-warning/40 text-warning" },
    accepted: { label: "Confirmado", className: "border-success/40 text-success" },
    declined: { label: "Recusado", className: "border-destructive/40 text-destructive" },
  } as const;
  const cfg = statusConfig[challenge.status];

  return (
    <Card className="relative overflow-hidden border-border bg-card p-5">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {mode === "received" ? "Desafio de" : mode === "sent" ? "Você desafiou" : "Confronto vs"}
            </div>
            <div className="mt-1.5"><TeamBadge teamId={otherId} size="md" /></div>
          </div>
          <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
        </div>

        <p className="mb-4 rounded-md bg-surface px-3 py-2 text-sm italic text-muted-foreground">"{challenge.message}"</p>

        <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-border bg-surface p-2.5">
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Quando</div>
            <div className="font-display text-sm">
              {new Date(challenge.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} · {challenge.time}
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface p-2.5">
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Onde</div>
            <div className="font-display text-sm truncate">{field?.name}</div>
          </div>
        </div>

        <RefereeRequestPanel challenge={challenge} canAttach={isCreator && challenge.status !== "declined"} onAttach={() => setRefOpen(true)} />

        {mode === "received" && challenge.status === "pending" && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { declineChallenge(challenge.id); toast("Desafio recusado."); }}>
              <X className="mr-1 h-4 w-4" /> Recusar
            </Button>
            <Button className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              onClick={() => { acceptChallenge(challenge.id); toast.success("Batalha confirmada! 🔥"); }}>
              <Check className="mr-1 h-4 w-4" /> Aceitar
            </Button>
          </div>
        )}
        {mode === "accepted" && !challenge.refereeRequest && (
          <Badge className="w-full justify-center bg-success/10 py-2 text-success hover:bg-success/10">⚡ Pronto pra batalha</Badge>
        )}
      </div>

      <AttachRefereeDialog open={refOpen} onOpenChange={setRefOpen} challenge={challenge} />
    </Card>
  );
}

function RefereeRequestPanel({
  challenge,
  canAttach,
  onAttach,
}: {
  challenge: Challenge;
  canAttach: boolean;
  onAttach: () => void;
}) {
  const req = challenge.refereeRequest;
  if (!req) {
    if (!canAttach) return null;
    return (
      <Button
        variant="outline"
        size="sm"
        className="mb-3 w-full border-referee/40 text-referee hover:bg-referee/10"
        onClick={onAttach}
      >
        <Gavel className="mr-1.5 h-4 w-4" /> Anexar pedido de arbitragem
      </Button>
    );
  }
  const statusMap = {
    pending: { label: "Aguardando árbitro", cls: "border-warning/40 text-warning" },
    accepted: { label: "Árbitro confirmado", cls: "border-success/40 text-success" },
    declined: { label: "Árbitro recusou", cls: "border-destructive/40 text-destructive" },
  } as const;
  const st = statusMap[req.status];
  return (
    <div className="mb-3 rounded-lg border border-referee/30 bg-referee/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-referee" />
          <div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Súmula digital</div>
            <div className="text-sm font-semibold">{req.refereeName}</div>
          </div>
        </div>
        <Badge variant="outline" className={st.cls}>{st.label}</Badge>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Após o jogo, o placar e estatísticas só entram no ranking quando o árbitro assinar a súmula.
      </p>
      {req.status === "accepted" && req.matchId && (
        <Link
          to="/sumula/$matchId"
          params={{ matchId: req.matchId }}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-referee underline-offset-4 hover:underline"
        >
          Ver súmula →
        </Link>
      )}
    </div>
  );
}

function AttachRefereeDialog({
  open,
  onOpenChange,
  challenge,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  challenge: Challenge;
}) {
  const { referees, requestRefereeForChallenge } = useStore();
  const [selected, setSelected] = useState<string>("");

  const list = useMemo<Referee[]>(() => {
    return referees
      .filter((r) => r.availableDays.includes(challenge.date) && r.availableTimes.includes(challenge.time))
      .concat(referees.filter((r) => !(r.availableDays.includes(challenge.date) && r.availableTimes.includes(challenge.time))));
  }, [referees, challenge.date, challenge.time]);

  const submit = () => {
    if (!selected) return toast.error("Selecione um árbitro.");
    requestRefereeForChallenge(challenge.id, selected);
    toast.success("Pedido enviado. Árbitro receberá uma notificação.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-referee" /> Contratar árbitro
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Para {new Date(challenge.date).toLocaleDateString("pt-BR")} · {challenge.time}. Disponíveis aparecem primeiro.
        </p>
        <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
          {list.map((r) => {
            const available = r.availableDays.includes(challenge.date) && r.availableTimes.includes(challenge.time);
            const tier = REFEREE_TIER_INFO[r.tier];
            const isSel = selected === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition",
                  isSel ? "border-referee bg-referee/10" : "border-border bg-surface hover:border-referee/40",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-referee/10 text-xl">{r.avatar}</div>
                  <div>
                    <div className="text-sm font-semibold">{r.name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className={cn("rounded border px-1.5 py-0.5 font-mono uppercase tracking-wider", tier.tokenClass)}>
                        {tier.label}
                      </span>
                      <span>★ {r.score.toFixed(1)}</span>
                      <span>{r.city}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">R$ {r.pricePerGame}</div>
                  <div className={cn("text-[10px]", available ? "text-success" : "text-muted-foreground")}>
                    {available ? "Disponível" : "Sem horário"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-gradient-referee text-background shadow-glow-referee" onClick={submit}>
            Enviar pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
