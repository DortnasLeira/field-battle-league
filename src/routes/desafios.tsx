import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Swords, Inbox, Send, Check, X, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TeamBadge } from "@/components/TeamBadge";
import { useStore } from "@/lib/store";
import { FiltersPanel } from "@/components/FiltersPanel";
import type { Challenge } from "@/lib/mockData";

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
        {mode === "accepted" && (
          <Badge className="w-full justify-center bg-success/10 py-2 text-success hover:bg-success/10">⚡ Pronto pra batalha</Badge>
        )}
      </div>
    </Card>
  );
}
