import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Swords, Inbox, Send, Check, X, Flame, Award, Gavel, Plus, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { TeamBadge } from "@/components/TeamBadge";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { FiltersPanel } from "@/components/FiltersPanel";
import { CityCombobox } from "@/components/CityCombobox";
import type { Challenge, Referee } from "@/lib/mockData";
import { REFEREE_TIER_INFO } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { cityDistanceKm, getCityCoords } from "@/lib/cityDistance";


export const Route = createFileRoute("/desafios")({
  validateSearch: (s: Record<string, unknown>) => ({
    opponent: typeof s.opponent === "string" ? s.opponent : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Batalhas — PeladaPro" },
      { name: "description", content: "Desafios entre times: enviados, recebidos e aceitos." },
    ],
  }),
  component: DesafiosPage,
});

function DesafiosPage() {
  const { challenges, currentTeamId, teams, fields, createChallenge } = useStore();
  const { activeProfile, session } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [fStatus, setFStatus] = useState<string>("all");
  const [fDate, setFDate] = useState("");
  const [fTimeFrom, setFTimeFrom] = useState("");
  const [fTimeTo, setFTimeTo] = useState("");
  const [tab, setTab] = useState<string>("received");
  const [createOpen, setCreateOpen] = useState(false);
  const [opponentId, setOpponentId] = useState<string | undefined>(search.opponent);

  // Reage à navegação vinda de /buscar com ?opponent=...
  useEffect(() => {
    if (!search.opponent) return;
    if (!session) {
      toast.error("Faça login para criar um desafio.");
      navigate({ to: "/auth", search: { redirect: "/desafios" } });
      return;
    }
    if (activeProfile?.type !== "team") {
      toast.error("Apenas perfis de Time podem criar desafios. Ative o perfil de Time no header.");
      // limpa o param para evitar reabrir
      navigate({ to: "/desafios", search: {}, replace: true });
      return;
    }
    setOpponentId(search.opponent);
    setCreateOpen(true);
  }, [search.opponent, session, activeProfile?.type, navigate]);

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

  const handleCreate = (payload: { toTeamId: string; fieldId: string; date: string; time: string; message: string }) => {
    if (activeProfile?.type !== "team") {
      toast.error("Apenas perfis de Time podem criar desafios.");
      return;
    }
    if (!payload.toTeamId || !payload.fieldId || !payload.date || !payload.time) {
      toast.error("Preencha campo, data e horário.");
      return;
    }
    createChallenge({
      fromTeamId: currentTeamId,
      toTeamId: payload.toTeamId,
      fieldId: payload.fieldId,
      date: payload.date,
      time: payload.time,
      message: payload.message || "Bora pra cima!",
    });
    toast.success("Desafio enviado! 🔥");
    setCreateOpen(false);
    setTab("sent");
    navigate({ to: "/desafios", search: {}, replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl flex items-center gap-3">
            <Swords className="h-8 w-8 text-primary" /> Batalhas
          </h1>
          <p className="text-sm text-muted-foreground">Desafios pendentes, lançados e confrontos confirmados.</p>
        </div>
        <Button
          className="bg-gradient-primary text-primary-foreground shadow-glow"
          onClick={() => {
            if (!session) {
              toast.error("Faça login para criar um desafio.");
              navigate({ to: "/auth", search: { redirect: "/desafios" } });
              return;
            }
            if (activeProfile?.type !== "team") {
              toast.error("Apenas perfis de Time podem criar desafios.");
              return;
            }
            setOpponentId(undefined);
            setCreateOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Novo desafio
        </Button>
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

      <Tabs value={tab} onValueChange={setTab}>
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

      <CreateChallengeDialog
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v);
          if (!v && search.opponent) navigate({ to: "/desafios", search: {}, replace: true });
        }}
        teams={teams}
        fields={fields}
        currentTeamId={currentTeamId}
        lockedOpponentId={opponentId}
        canCreate={activeProfile?.type === "team"}
        onSubmit={handleCreate}
      />
    </div>
  );
}

function CreateChallengeDialog({
  open,
  onOpenChange,
  teams,
  fields,
  currentTeamId,
  lockedOpponentId,
  canCreate,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  teams: { id: string; name: string }[];
  fields: { id: string; name: string }[];
  currentTeamId: string;
  lockedOpponentId?: string;
  canCreate: boolean;
  onSubmit: (p: { toTeamId: string; fieldId: string; date: string; time: string; message: string }) => void;
}) {
  const [toTeamId, setToTeamId] = useState<string>(lockedOpponentId ?? "");
  const [fieldId, setFieldId] = useState<string>(fields[0]?.id ?? "");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("20:00");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (open) {
      setToTeamId(lockedOpponentId ?? "");
      setFieldId(fields[0]?.id ?? "");
      setMessage("");
    }
  }, [open, lockedOpponentId, fields]);

  const opponent = teams.find((t) => t.id === toTeamId);
  const opponentOptions = teams.filter((t) => t.id !== currentTeamId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wide flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" /> Novo desafio
          </DialogTitle>
          <DialogDescription>
            {lockedOpponentId && opponent
              ? <>Você vai desafiar <strong>{opponent.name}</strong>.</>
              : "Escolha o adversário e marque o confronto."}
          </DialogDescription>
        </DialogHeader>

        {!canCreate ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Apenas perfis de <strong>Time</strong> podem criar desafios. Ative o perfil de Time no header.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Adversário</Label>
              {lockedOpponentId ? (
                <div className="mt-1 rounded-md border border-primary/40 bg-primary/5 p-2.5">
                  <TeamBadge teamId={lockedOpponentId} size="md" />
                </div>
              ) : (
                <Select value={toTeamId} onValueChange={setToTeamId}>
                  <SelectTrigger><SelectValue placeholder="Escolha um time" /></SelectTrigger>
                  <SelectContent>
                    {opponentOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Campo</Label>
              <Select value={fieldId} onValueChange={setFieldId}>
                <SelectTrigger><SelectValue placeholder="Escolha um campo" /></SelectTrigger>
                <SelectContent>
                  {fields.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Data</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Horário</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Mensagem (opcional)</Label>
              <Textarea
                placeholder="Bora pra cima!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            className="bg-gradient-primary text-primary-foreground shadow-glow"
            disabled={!canCreate}
            onClick={() => onSubmit({ toTeamId, fieldId, date, time, message })}
          >
            Enviar desafio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const { referees: mockRefs, fields, requestRefereeForChallenge } = useStore();
  const [selected, setSelected] = useState<string>("");
  const [dbRefs, setDbRefs] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unavailableIds, setUnavailableIds] = useState<Set<string>>(new Set());
  const [filterTier, setFilterTier] = useState<string>("all");
  const [onlyCompatible, setOnlyCompatible] = useState<boolean>(true);
  const [cityFilter, setCityFilter] = useState<string>("");
  const [radiusKm, setRadiusKm] = useState<number>(0);
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [minExperience, setMinExperience] = useState<string>("0");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const field = fields.find((f) => f.id === challenge.fieldId);
  const challengeCity = (field?.address?.split(",").pop() ?? "").trim();

  // Inicializa cidade com a do desafio quando abre
  useEffect(() => {
    if (open) setCityFilter(challengeCity);
  }, [open, challengeCity]);


  const DB_TIER_MAP: Record<string, "Bronze" | "Prata" | "Ouro"> = { bronze: "Bronze", silver: "Prata", gold: "Ouro" };

  // Reseta estado ao fechar
  useEffect(() => {
    if (!open) {
      setSelected("");
      setSubmitting(false);
      setUnavailableIds(new Set());
    }
  }, [open]);

  // Carrega árbitros reais ao abrir
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("referees")
        .select("referee_id, display_name, city, tier, price_per_game, score, reviews_count, experience_years, certifications, available_days, available_times, bio, active")
        .eq("active", true);
      if (cancelled) return;
      const mapped: Referee[] = (data ?? []).map((r: any) => ({
        id: String(r.referee_id),
        name: String(r.display_name ?? ""),
        avatar: "🟨",
        city: String(r.city ?? ""),
        pricePerGame: Number(r.price_per_game) || 0,
        score: Number(r.score) || 0,
        reviews: Number(r.reviews_count) || 0,
        experienceYears: Number(r.experience_years) || 0,
        tier: DB_TIER_MAP[String(r.tier)] ?? "Bronze",
        certifications: (r.certifications as string[]) ?? [],
        availableDays: (r.available_days as string[]) ?? [],
        availableTimes: (r.available_times as string[]) ?? [],
        bio: String(r.bio ?? ""),
        hireHistory: [],
      }));
      setDbRefs(mapped);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open]);

  const allRefs = useMemo<Referee[]>(() => {
    const byId = new Map<string, Referee>();
    [...dbRefs, ...mockRefs].forEach((r) => { if (!byId.has(r.id)) byId.set(r.id, r); });
    return Array.from(byId.values());
  }, [dbRefs, mockRefs]);

  const isCompat = (r: Referee) =>
    r.availableDays.includes(challenge.date) && r.availableTimes.includes(challenge.time);

  const list = useMemo<Referee[]>(() => {
    const norm = (s: string) => s.trim().toLowerCase();
    const cityNorm = norm(cityFilter);
    const pMin = priceMin === "" ? null : Number(priceMin);
    const pMax = priceMax === "" ? null : Number(priceMax);
    const minExp = Number(minExperience) || 0;
    const filterCoords = getCityCoords(cityFilter);
    const useRadius = radiusKm > 0 && !!filterCoords;

    let arr = allRefs.slice();
    if (filterTier !== "all") arr = arr.filter((r) => r.tier === filterTier);
    if (cityNorm) {
      if (useRadius) {
        arr = arr.filter((r) => {
          if (norm(r.city) === cityNorm) return true;
          const d = cityDistanceKm(cityFilter, r.city);
          return d != null && d <= radiusKm;
        });
      } else {
        arr = arr.filter((r) => norm(r.city) === cityNorm);
      }
    }
    if (pMin != null && !Number.isNaN(pMin)) arr = arr.filter((r) => r.pricePerGame >= pMin);
    if (pMax != null && !Number.isNaN(pMax)) arr = arr.filter((r) => r.pricePerGame <= pMax);
    if (minExp > 0) arr = arr.filter((r) => (r.experienceYears ?? 0) >= minExp);
    if (onlyCompatible) arr = arr.filter(isCompat);

    return arr.sort((a, b) => {
      // Quando usando raio, ordena também por distância crescente
      if (useRadius) {
        const da = cityDistanceKm(cityFilter, a.city) ?? Number.POSITIVE_INFINITY;
        const db = cityDistanceKm(cityFilter, b.city) ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
      }
      const ac = (isCompat(a) ? 2 : 0) + (norm(a.city) === norm(challengeCity) ? 1 : 0);
      const bc = (isCompat(b) ? 2 : 0) + (norm(b.city) === norm(challengeCity) ? 1 : 0);
      if (ac !== bc) return bc - ac;
      return b.score - a.score;
    });
  }, [allRefs, filterTier, onlyCompatible, cityFilter, radiusKm, priceMin, priceMax, minExperience, challengeCity, challenge.date, challenge.time]);

  const resetFilters = () => {
    setFilterTier("all");
    setOnlyCompatible(true);
    setCityFilter(challengeCity);
    setRadiusKm(0);
    setPriceMin("");
    setPriceMax("");
    setMinExperience("0");
  };
  const activeAdvancedCount =
    (priceMin !== "" ? 1 : 0) + (priceMax !== "" ? 1 : 0) + ((Number(minExperience) || 0) > 0 ? 1 : 0) + (radiusKm > 0 ? 1 : 0);

  const submit = async () => {
    if (submitting) return;
    if (!selected) {
      toast.error("Selecione um árbitro.");
      return;
    }
    if (unavailableIds.has(selected)) {
      toast.error("Este árbitro não está mais disponível.");
      return;
    }

    setSubmitting(true);
    try {
      // Revalida no banco se for um árbitro real
      const isDbRef = dbRefs.some((r) => r.id === selected);
      if (isDbRef) {
        const { data, error } = await supabase
          .from("referees")
          .select("active, available_days, available_times")
          .eq("referee_id", selected)
          .maybeSingle();

        if (error) {
          toast.error("Falha ao validar disponibilidade.", { description: error.message });
          return;
        }
        if (!data || !data.active) {
          setUnavailableIds((s) => new Set(s).add(selected));
          toast.error("Este árbitro não está mais disponível.", {
            description: "Selecione outro árbitro da lista.",
          });
          setSelected("");
          return;
        }
        const days = (data.available_days as string[]) ?? [];
        const times = (data.available_times as string[]) ?? [];
        const stillCompat =
          (days.length === 0 || days.includes(challenge.date)) &&
          (times.length === 0 || times.includes(challenge.time));
        if (!stillCompat) {
          setUnavailableIds((s) => new Set(s).add(selected));
          toast.error("Árbitro indisponível neste horário.", {
            description: "A disponibilidade foi atualizada — escolha outro árbitro.",
          });
          return;
        }
      }

      requestRefereeForChallenge(challenge.id, selected);
      toast.success("Pedido enviado. Árbitro receberá uma notificação.");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
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
          Para {new Date(challenge.date).toLocaleDateString("pt-BR")} · {challenge.time}
          {challengeCity ? ` em ${challengeCity}` : ""}.
        </p>

        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nível</Label>
              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Prata">Prata</SelectItem>
                  <SelectItem value="Ouro">Ouro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cidade</Label>
              <div className="flex gap-1">
                <CityCombobox value={cityFilter} onChange={setCityFilter} placeholder="Qualquer cidade" className="h-9 flex-1" />
                {cityFilter && (
                  <Button type="button" variant="outline" size="sm" className="h-9 px-2" onClick={() => setCityFilter("")} title="Limpar cidade">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {cityFilter && (
            <div className="rounded-lg border border-referee/20 bg-referee/5 px-3 py-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Raio de busca: {radiusKm > 0 ? (
                  <span className="text-referee">{radiusKm} km</span>
                ) : (
                  <span className="text-referee">somente esta cidade</span>
                )}
                {radiusKm > 0 && !getCityCoords(cityFilter) && (
                  <span className="ml-2 text-warning">
                    (cidade sem coordenadas — usando nome exato)
                  </span>
                )}
              </Label>
              <input
                type="range"
                min={0}
                max={300}
                step={10}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="mt-1 w-full accent-[hsl(var(--referee))]"
                disabled={!getCityCoords(cityFilter)}
              />
              <div className="mt-0.5 flex justify-between text-[9px] text-muted-foreground">
                <span>0</span><span>100</span><span>200</span><span>300 km</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--referee))]" checked={onlyCompatible} onChange={(e) => setOnlyCompatible(e.target.checked)} />
              <span>Disponível no dia/horário</span>
            </label>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-referee hover:bg-referee/10" onClick={() => setShowAdvanced((v) => !v)}>
              {showAdvanced ? "Ocultar filtros avançados" : "Filtros avançados"}
              {activeAdvancedCount > 0 && (
                <span className="ml-1 rounded bg-referee/20 px-1.5 py-0.5 font-mono text-[9px] text-referee">{activeAdvancedCount}</span>
              )}
            </Button>
          </div>

          {showAdvanced && (
            <div className="rounded-lg border border-referee/20 bg-referee/5 p-3 space-y-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Faixa de preço por jogo (R$)</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input type="number" inputMode="numeric" min={0} placeholder="Min" className="h-9" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
                  <span className="text-xs text-muted-foreground">—</span>
                  <Input type="number" inputMode="numeric" min={0} placeholder="Max" className="h-9" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Experiência mínima: <span className="text-referee">{minExperience || 0} {Number(minExperience) === 1 ? "ano" : "anos"}</span>
                </Label>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={minExperience}
                  onChange={(e) => setMinExperience(e.target.value)}
                  className="mt-1 w-full accent-[hsl(var(--referee))]"
                />
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={resetFilters}>
                  Limpar filtros
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
          {loading && <p className="text-center text-xs text-muted-foreground">Carregando árbitros…</p>}
          {!loading && list.length === 0 && (
            <p className="rounded-md border border-dashed border-border bg-surface px-3 py-6 text-center text-xs text-muted-foreground">
              Nenhum árbitro encontrado com esses filtros.
            </p>
          )}
          {list.map((r) => {
            const available = isCompat(r);
            const sameCity = r.city.trim().toLowerCase() === challengeCity.trim().toLowerCase();
            const distKm =
              cityFilter && radiusKm > 0 && !sameCity
                ? cityDistanceKm(cityFilter, r.city)
                : null;
            const tier = REFEREE_TIER_INFO[r.tier];
            const isSel = selected === r.id;
            const isUnavailable = unavailableIds.has(r.id);
            return (
              <button
                key={r.id}
                type="button"
                disabled={submitting || isUnavailable}
                onClick={() => setSelected(r.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition",
                  isSel ? "border-referee bg-referee/10" : "border-border bg-surface hover:border-referee/40",
                  (submitting || isUnavailable) && "opacity-50 cursor-not-allowed",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-referee/10 text-xl">🟨</div>
                  <div>
                    <div className="text-sm font-semibold">{r.name}</div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                      <span className={cn("rounded border px-1.5 py-0.5 font-mono uppercase tracking-wider", tier.tokenClass)}>
                        {tier.label}
                      </span>
                      <span>★ {r.score.toFixed(1)}</span>
                      <span className={sameCity ? "text-referee" : ""}>{r.city || "—"}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">R$ {r.pricePerGame}</div>
                  <div className={cn("text-[10px]", isUnavailable ? "text-destructive" : available ? "text-success" : "text-muted-foreground")}>
                    {isUnavailable ? "Indisponível" : available ? "Disponível" : "Sem horário"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button
            className="bg-gradient-referee text-background shadow-glow-referee"
            onClick={submit}
            disabled={submitting || loading || !selected}
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…</>
            ) : (
              "Enviar pedido"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

