import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  UserPlus,
  Users,
  Plus,
  Trash2,
  Check,
  X,
  Inbox,
  Send,
  Megaphone,
  Calendar,
  Shield,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import {
  ALL_POSITIONS,
  type Position,
  type PositionOpening,
} from "@/lib/mockData";

export const Route = createFileRoute("/vagas")({
  head: () => ({
    meta: [
      { title: "Vagas — PeladaPro" },
      {
        name: "description",
        content:
          "Anuncie vagas de posição no seu time ou inscreva-se para completar um elenco no futebol amador.",
      },
    ],
  }),
  component: VagasPage,
});

const LEVELS = ["Iniciante", "Intermediário", "Avançado"] as const;

function VagasPage() {
  const {
    openings,
    applications,
    teams,
    currentTeamId,
    createOpening,
    deleteOpening,
    setOpeningStatus,
    applyToOpening,
    acceptApplication,
    rejectApplication,
  } = useStore();

  const [fPosition, setFPosition] = useState<string>("all");
  const [fLevel, setFLevel] = useState<string>("all");
  const [fCity, setFCity] = useState<string>("");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fDateFrom, setFDateFrom] = useState<string>("");
  const [fDateTo, setFDateTo] = useState<string>("");

  const myOpenings = openings.filter((o) => o.teamId === currentTeamId);
  const otherOpenings = openings
    .filter((o) => o.teamId !== currentTeamId)
    .filter((o) => {
      const team = teams.find((t) => t.id === o.teamId);
      if (fPosition !== "all" && o.position !== fPosition) return false;
      if (fLevel !== "all" && o.level !== fLevel) return false;
      if (fStatus !== "all" ? o.status !== fStatus : o.status !== "open") return false;
      if (fCity && !(team?.city ?? "").toLowerCase().includes(fCity.toLowerCase())) return false;
      if (fDateFrom && o.createdAt < fDateFrom) return false;
      if (fDateTo && o.createdAt > fDateTo) return false;
      return true;
    });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="relative overflow-hidden border-border bg-gradient-hero p-6 sm:p-8">
        <div className="field-pattern absolute inset-0 opacity-30" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge className="mb-2 bg-primary/15 text-primary hover:bg-primary/20">
              <Megaphone className="mr-1 h-3 w-3" /> Mercado de Jogadores
            </Badge>
            <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
              Vagas <span className="text-gradient-primary">de Posição</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Anuncie posições em aberto no seu time ou inscreva-se para completar um elenco.
            </p>
          </div>
          <NewOpeningDialog onCreate={createOpening} currentTeamId={currentTeamId} />
        </div>
      </Card>

      <Tabs defaultValue="market" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="market" className="font-display uppercase tracking-wide">
            <Users className="mr-2 h-4 w-4" /> Mercado ({otherOpenings.length})
          </TabsTrigger>
          <TabsTrigger value="manage" className="font-display uppercase tracking-wide">
            <Shield className="mr-2 h-4 w-4" /> Minhas Vagas ({myOpenings.length})
          </TabsTrigger>
        </TabsList>

        {/* MERCADO */}
        <TabsContent value="market" className="mt-6 space-y-4">
          <Card className="border-border bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <Select value={fPosition} onValueChange={setFPosition}>
                <SelectTrigger><SelectValue placeholder="Posição" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas posições</SelectItem>
                  {ALL_POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fLevel} onValueChange={setFLevel}>
                <SelectTrigger><SelectValue placeholder="Nível" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos níveis</SelectItem>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Cidade" value={fCity} onChange={(e) => setFCity(e.target.value)} />
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Apenas abertas</SelectItem>
                  <SelectItem value="open">Aberta</SelectItem>
                  <SelectItem value="filled">Preenchida</SelectItem>
                  <SelectItem value="closed">Encerrada</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={fDateFrom} onChange={(e) => setFDateFrom(e.target.value)} title="Publicada a partir de" />
              <Input type="date" value={fDateTo} onChange={(e) => setFDateTo(e.target.value)} title="Publicada até" />
            </div>
          </Card>
          {otherOpenings.length === 0 && (
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title="Nenhuma vaga encontrada"
              hint="Ajuste os filtros ou volte mais tarde."
            />
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {otherOpenings.map((o) => {
              const team = teams.find((t) => t.id === o.teamId);
              return (
                <OpeningCard
                  key={o.id}
                  opening={o}
                  teamName={team?.name ?? "Time"}
                  teamShield={team?.shield ?? "⚽"}
                  teamCity={team?.city ?? ""}
                  onApply={(payload) => {
                    applyToOpening({ openingId: o.id, ...payload });
                    toast.success("Inscrição enviada! O capitão vai avaliar seu perfil.");
                  }}
                />
              );
            })}
          </div>
        </TabsContent>

        {/* MINHAS VAGAS */}
        <TabsContent value="manage" className="mt-6 space-y-6">
          {myOpenings.length === 0 && (
            <EmptyState
              icon={<Send className="h-8 w-8" />}
              title="Você ainda não anunciou vagas"
              hint='Clique em "Anunciar vaga" para divulgar uma posição em aberto.'
            />
          )}
          {myOpenings.map((o) => {
            const apps = applications.filter((a) => a.openingId === o.id);
            const accepted = apps.filter((a) => a.status === "accepted").length;
            return (
              <Card key={o.id} className="border-border bg-card">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg uppercase tracking-wide">
                          {o.position}
                        </h3>
                        <StatusBadge status={o.status} />
                        <Badge variant="outline" className="border-border text-muted-foreground">
                          {o.level}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{o.description}</p>
                      <div className="mt-2 flex items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        <span className="stat-num text-primary">
                          {accepted}/{o.slots} preenchida{o.slots > 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {o.createdAt}
                        </span>
                        <span>{apps.length} inscrito{apps.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {o.status === "open" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setOpeningStatus(o.id, "closed");
                          toast.info("Vaga encerrada.");
                        }}
                      >
                        Encerrar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOpeningStatus(o.id, "open")}
                      >
                        Reabrir
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        deleteOpening(o.id);
                        toast.success("Vaga removida.");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Inscritos */}
                <div className="space-y-2 p-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Inscrições recebidas
                  </div>
                  {apps.length === 0 && (
                    <p className="rounded-md bg-surface p-4 text-sm text-muted-foreground">
                      Nenhum jogador se inscreveu ainda.
                    </p>
                  )}
                  {apps.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-col gap-3 rounded-md bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{a.playerName}</span>
                          <Badge variant="outline" className="border-border text-xs">
                            {a.playerAge} anos
                          </Badge>
                          <ApplicationStatusBadge status={a.status} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{a.experience}</p>
                        {a.message && (
                          <p className="mt-1 text-sm italic text-foreground/80">"{a.message}"</p>
                        )}
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {a.playerPhone} · {a.createdAt}
                        </div>
                      </div>
                      {a.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-success text-success-foreground hover:bg-success/90"
                            onClick={() => {
                              acceptApplication(a.id);
                              toast.success(`${a.playerName} aceito no time!`);
                            }}
                          >
                            <Check className="mr-1 h-4 w-4" /> Aceitar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              rejectApplication(a.id);
                              toast.info("Inscrição recusada.");
                            }}
                          >
                            <X className="mr-1 h-4 w-4" /> Recusar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Sub-componentes ---------- */

function StatusBadge({ status }: { status: PositionOpening["status"] }) {
  if (status === "open")
    return (
      <Badge className="bg-success/15 text-success hover:bg-success/20">Aberta</Badge>
    );
  if (status === "filled")
    return (
      <Badge className="bg-primary/15 text-primary hover:bg-primary/20">Preenchida</Badge>
    );
  return (
    <Badge variant="outline" className="border-border text-muted-foreground">
      Encerrada
    </Badge>
  );
}

function ApplicationStatusBadge({ status }: { status: "pending" | "accepted" | "rejected" }) {
  if (status === "accepted")
    return <Badge className="bg-success/15 text-success hover:bg-success/20">Aceito</Badge>;
  if (status === "rejected")
    return (
      <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20">
        Recusado
      </Badge>
    );
  return (
    <Badge className="bg-warning/15 text-warning hover:bg-warning/20">Pendente</Badge>
  );
}

function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-2 border-dashed border-border bg-card/50 p-10 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <div className="font-display uppercase tracking-wide">{title}</div>
      <p className="max-w-md text-sm text-muted-foreground">{hint}</p>
    </Card>
  );
}

function OpeningCard({
  opening,
  teamName,
  teamShield,
  teamCity,
  onApply,
}: {
  opening: PositionOpening;
  teamName: string;
  teamShield: string;
  teamCity: string;
  onApply: (payload: {
    playerName: string;
    playerAge: number;
    playerPhone: string;
    experience: string;
    message: string;
  }) => void;
}) {
  return (
    <Card className="flex flex-col border-border bg-card transition hover:border-primary/40">
      <div className="border-b border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-elevated text-2xl">
              {teamShield}
            </div>
            <div>
              <div className="font-display text-base uppercase tracking-wide">{teamName}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {teamCity}
              </div>
            </div>
          </div>
          <StatusBadge status={opening.status} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge className="bg-gradient-primary text-primary-foreground">
            <UserPlus className="mr-1 h-3 w-3" /> {opening.position}
          </Badge>
          <Badge variant="outline" className="border-border text-muted-foreground">
            {opening.level}
          </Badge>
          <span className="stat-num text-sm font-bold text-primary">
            {opening.slots} vaga{opening.slots > 1 ? "s" : ""}
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{opening.description}</p>
      </div>
      <div className="flex items-center justify-between p-5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Publicada em {opening.createdAt}
        </div>
        <ApplyDialog opening={opening} onApply={onApply} />
      </div>
    </Card>
  );
}

function ApplyDialog({
  opening,
  onApply,
}: {
  opening: PositionOpening;
  onApply: (payload: {
    playerName: string;
    playerAge: number;
    playerPhone: string;
    experience: string;
    message: string;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [exp, setExp] = useState("");
  const [msg, setMsg] = useState("");

  const reset = () => {
    setName(""); setAge(""); setPhone(""); setExp(""); setMsg("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-primary text-primary-foreground">
          <UserPlus className="mr-2 h-4 w-4" /> Inscrever-se
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wide">
            Inscrição — {opening.position}
          </DialogTitle>
          <DialogDescription>
            Preencha seus dados para se candidatar à vaga. O capitão entra em contato em caso de aprovação.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pname">Nome completo</Label>
            <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João Silva" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="page">Idade</Label>
              <Input id="page" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pphone">Telefone</Label>
              <Input id="pphone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pexp">Experiência</Label>
            <Textarea id="pexp" rows={2} value={exp} onChange={(e) => setExp(e.target.value)}
              placeholder="Conte rapidamente sobre sua experiência na posição." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pmsg">Mensagem (opcional)</Label>
            <Textarea id="pmsg" rows={2} value={msg} onChange={(e) => setMsg(e.target.value)}
              placeholder="Disponibilidade, motivação..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            className="bg-gradient-primary text-primary-foreground"
            disabled={!name || !age || !phone || !exp}
            onClick={() => {
              onApply({
                playerName: name,
                playerAge: Number(age),
                playerPhone: phone,
                experience: exp,
                message: msg,
              });
              setOpen(false);
              reset();
            }}
          >
            Enviar inscrição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewOpeningDialog({
  onCreate,
  currentTeamId,
}: {
  onCreate: (o: {
    teamId: string;
    position: Position;
    slots: number;
    level: "Iniciante" | "Intermediário" | "Avançado";
    description: string;
  }) => void;
  currentTeamId: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>("Atacante");
  const [slots, setSlots] = useState("1");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("Intermediário");
  const [desc, setDesc] = useState("");

  const reset = () => {
    setPosition("Atacante"); setSlots("1"); setLevel("Intermediário"); setDesc("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Plus className="mr-2 h-4 w-4" /> Anunciar vaga
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wide">
            Anunciar nova vaga
          </DialogTitle>
          <DialogDescription>
            Divulgue uma posição em aberto no seu time. Jogadores poderão se inscrever.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Posição</Label>
              <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_POSITIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Nível</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slots">Quantidade de vagas</Label>
            <Input id="slots" type="number" min={1} value={slots} onChange={(e) => setSlots(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="desc">Descrição</Label>
            <Textarea id="desc" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="Detalhes da vaga, treinos, perfil esperado..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            className="bg-gradient-primary text-primary-foreground"
            disabled={!desc || Number(slots) < 1}
            onClick={() => {
              onCreate({
                teamId: currentTeamId,
                position,
                slots: Number(slots),
                level,
                description: desc,
              });
              toast.success("Vaga anunciada! Jogadores já podem se inscrever.");
              setOpen(false);
              reset();
            }}
          >
            Publicar vaga
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
