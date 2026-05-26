import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Star, DollarSign, Award, Calendar, Clock, Flag as Whistle, History, Trophy, Lock as LockIcon, X, CheckCircle2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { referees as mockReferees, REFEREE_TIER_INFO, type Referee, type RefereeTier } from "@/lib/mockData";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type HireRow = {
  id: string;
  referee_id: string;
  hire_date: string;
  hire_time: string;
  message: string | null;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DB_TIER_TO_LABEL: Record<string, RefereeTier> = {
  bronze: "Bronze",
  silver: "Prata",
  gold: "Ouro",
};

export const Route = createFileRoute("/arbitro/$id")({
  head: () => ({ meta: [{ title: "Perfil do Árbitro — PeladaPro" }] }),
  component: RefereeProfilePage,
});

function RefereeProfilePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { session, activeProfile } = useAuth();
  const [referee, setReferee] = useState<Referee | null>(null);
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hireOpen, setHireOpen] = useState(false);
  const [hireDate, setHireDate] = useState<string>("");
  const [hireTime, setHireTime] = useState<string>("");
  const [hireMsg, setHireMsg] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [myHires, setMyHires] = useState<HireRow[]>([]);

  // Load referee: try DB by UUID first, then fallback to mock by id.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (UUID_RE.test(id)) {
        const { data: r } = await supabase
          .from("referees")
          .select("*")
          .eq("referee_id", id)
          .maybeSingle();
        if (r && !cancelled) {
          const { data: prof } = await supabase
            .from("user_profiles")
            .select("avatar, name, city, nickname")
            .eq("user_id", id)
            .eq("type", "referee")
            .maybeSingle();
          const tierLabel = DB_TIER_TO_LABEL[r.tier as string] ?? "Bronze";
          setReferee({
            id: r.referee_id,
            name: prof?.name || r.display_name,
            avatar: prof?.avatar || "🟨",
            city: r.city || prof?.city || "",
            pricePerGame: Number(r.price_per_game) || 0,
            score: Number(r.score) || 0,
            reviews: r.reviews_count || 0,
            experienceYears: r.experience_years || 0,
            tier: tierLabel,
            certifications: r.certifications || [],
            availableDays: r.available_days || [],
            availableTimes: r.available_times || [],
            bio: r.bio || "",
            hireHistory: [],
          });
          setActive(r.active);
          setLoading(false);
          return;
        }
      }
      const m = mockReferees.find((r) => r.id === id) ?? null;
      if (!cancelled) {
        setReferee(m);
        setActive(true);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (referee) {
      setHireDate(referee.availableDays[0] ?? "");
      setHireTime(referee.availableTimes[0] ?? "");
    }
  }, [referee?.id]);


  const loadHires = async () => {
    if (!session || !referee) return;
    const { data } = await supabase
      .from("referee_hires")
      .select("id, referee_id, hire_date, hire_time, message, status, created_at")
      .eq("referee_id", referee.id)
      .eq("requester_user_id", session.user.id)
      .order("created_at", { ascending: false });
    setMyHires((data ?? []) as HireRow[]);
  };
  useEffect(() => { loadHires(); }, [session?.user.id, referee?.id]);


  if (loading) {
    return (
      <Card className="border-border bg-card p-8 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Carregando perfil…
      </Card>
    );
  }

  if (!referee) {
    return (
      <Card data-testid="not-found" className="border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Árbitro não encontrado. <Link to="/buscar" className="text-primary underline">Voltar à busca</Link>
      </Card>
    );
  }

  const refereeData = referee;


  const tier = REFEREE_TIER_INFO[referee.tier];
  const canHire = activeProfile?.type === "team" || activeProfile?.type === "field";

  const onHire = () => {
    if (!session) {
      toast.error("Faça login para contratar.");
      navigate({ to: "/auth", search: { redirect: `/arbitro/${id}` } });
      return;
    }
    if (!canHire) {
      toast.error("Apenas perfis TIME ou CAMPO podem contratar árbitros.");
      return;
    }
    setHireOpen(true);
  };

  const submitHire = async () => {
    if (!session || !referee || !activeProfile) return;
    if (activeProfile.type !== "team" && activeProfile.type !== "field") {
      toast.error("Apenas perfis TIME ou CAMPO podem contratar árbitros.");
      return;
    }
    if (!hireDate || !hireTime) {
      toast.error("Selecione data e horário.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("referee_hires").insert({
      referee_id: referee.id,
      referee_name: referee.name,
      requester_user_id: session.user.id,
      requester_profile_type: activeProfile.type,
      requester_name: activeProfile.name,
      hire_date: hireDate,
      hire_time: hireTime,
      price: referee.pricePerGame,
      message: hireMsg || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível enviar a solicitação.", { description: error.message });
      return;
    }
    toast.success("Solicitação enviada! Aguardando confirmação do árbitro.");
    setHireOpen(false);
    setHireMsg("");
    loadHires();
  };

  const cancelHire = async (hireId: string) => {
    const { error } = await supabase
      .from("referee_hires")
      .update({ status: "cancelled" })
      .eq("id", hireId);
    if (error) {
      toast.error("Não foi possível cancelar.", { description: error.message });
      return;
    }
    toast.success("Solicitação cancelada.");
    loadHires();
  };

  const completed = referee.hireHistory.filter((h) => h.status === "completed");
  const upcoming = referee.hireHistory.filter((h) => h.status === "scheduled");

  return (
    <div className="space-y-6" data-testid="referee-profile" data-visitor={!session ? "true" : "false"}>
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/buscar"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar à busca</Link>
      </Button>

      {/* Header */}
      <Card className="relative overflow-hidden border-referee/40 bg-card p-6 shadow-glow-referee">
        <div className="absolute inset-0 bg-gradient-referee opacity-10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-referee/20 text-5xl ring-2 ring-referee/60">
            {referee.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Whistle className="h-4 w-4 text-referee" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-referee">Árbitro</span>
            </div>
            <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">{referee.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{referee.city}</span>
              {session && (
                <span data-testid="referee-rating" className="inline-flex items-center gap-1 text-referee"><Star className="h-3 w-3 fill-current" />{referee.score.toFixed(1)} <span className="text-muted-foreground">({referee.reviews} avaliações)</span></span>
              )}
              <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" />R$ {referee.pricePerGame}/jogo</span>
              <span>{referee.experienceYears} anos de experiência</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("font-display uppercase tracking-wider", tier.tokenClass)}>
                <Trophy className="mr-1 h-3 w-3" /> Nível {tier.label}
              </Badge>
              <span className="text-[11px] text-muted-foreground">{tier.description}</span>
            </div>
          </div>
          <Button size="lg" onClick={onHire} className="bg-referee text-referee-foreground hover:bg-referee/90">
            {!session || canHire ? <Whistle className="mr-1 h-4 w-4" /> : <LockIcon className="mr-1 h-4 w-4" />}
            Contratar
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Bio + certs */}
        <Card className="border-border bg-card p-5 lg:col-span-2">
          <h2 className="font-display text-lg uppercase tracking-wide">Sobre</h2>
          <p className="mt-2 text-sm text-muted-foreground">{referee.bio}</p>

          <div className="mt-4">
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Certificações</h3>
            {referee.certifications.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">Nenhuma certificação registrada.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {referee.certifications.map((c) => (
                  <Badge key={c} variant="outline" className="border-referee/50 text-referee">
                    <Award className="mr-1 h-3 w-3" />{c}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5">
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Sistema de Níveis</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(["Bronze", "Prata", "Ouro"] as const).map((t) => {
                const info = REFEREE_TIER_INFO[t];
                const active = referee.tier === t;
                return (
                  <div key={t} className={cn("rounded-md border p-3", active ? info.tokenClass + " bg-card/60" : "border-border opacity-60")}>
                    <div className="flex items-center gap-1 font-display uppercase tracking-wide">
                      <Trophy className="h-3.5 w-3.5" />{info.label}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{info.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Availability */}
        <Card className="border-border bg-card p-5">
          <h2 className="font-display text-lg uppercase tracking-wide">Disponibilidade</h2>
          <div className="mt-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <Calendar className="mr-0.5 inline h-3 w-3" /> Datas
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {referee.availableDays.map((d) => (
                <Badge key={d} variant="outline" className="border-border text-xs">
                  {new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </Badge>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <Clock className="mr-0.5 inline h-3 w-3" /> Horários
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {referee.availableTimes.map((t) => (
                <Badge key={t} variant="outline" className="border-border text-xs">{t}</Badge>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* History */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-referee" />
          <h2 className="font-display text-lg uppercase tracking-wide">Histórico de Contratações</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            ({completed.length} concluídas · {upcoming.length} agendadas)
          </span>
        </div>

        {referee.hireHistory.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Sem contratações registradas ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {referee.hireHistory.map((h) => (
              <li key={h.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-display text-sm uppercase tracking-wide truncate">{h.matchTitle}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {new Date(h.date).toLocaleDateString("pt-BR")} · {h.time} · {h.hirerType === "team" ? "Time" : "Campo"} · {h.hirerName}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {h.rating && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-referee">
                      <Star className="h-3 w-3 fill-current" />{h.rating.toFixed(1)}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      h.status === "completed" && "border-success/50 text-success",
                      h.status === "scheduled" && "border-referee/50 text-referee",
                      h.status === "cancelled" && "border-destructive/50 text-destructive",
                    )}
                  >
                    {h.status === "completed" ? "Concluída" : h.status === "scheduled" ? "Agendada" : "Cancelada"}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* My hire requests */}
      {session && (
        <Card data-testid="referee-my-requests" className="border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Whistle className="h-4 w-4 text-referee" />
            <h2 className="font-display text-lg uppercase tracking-wide">Minhas Solicitações</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">({myHires.length})</span>
          </div>
          {myHires.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Você ainda não enviou solicitações para este árbitro.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {myHires.map((h) => (
                <li key={h.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-display text-sm uppercase tracking-wide">
                      {new Date(h.hire_date).toLocaleDateString("pt-BR")} · {h.hire_time}
                    </div>
                    {h.message && (
                      <div className="text-xs text-muted-foreground truncate">"{h.message}"</div>
                    )}
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Enviada em {new Date(h.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={h.status} />
                    {h.status === "pending" && (
                      <Button size="sm" variant="ghost" onClick={() => cancelHire(h.id)} title="Cancelar solicitação">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Hire dialog */}
      <Dialog open={hireOpen} onOpenChange={setHireOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wide">Contratar árbitro</DialogTitle>
            <DialogDescription>
              Solicitação para <strong>{referee.name}</strong> · R$ {referee.pricePerGame}/jogo.
              {activeProfile && (
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Como <strong>{activeProfile.name}</strong> ({activeProfile.type === "team" ? "Time" : "Campo"})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {!canHire ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Apenas perfis <strong>TIME</strong> ou <strong>CAMPO</strong> podem contratar árbitros.
              Troque seu perfil ativo no header.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Data</Label>
                  <Input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    min={referee.availableDays[0]}
                    list={`avail-${referee.id}`}
                  />
                  <datalist id={`avail-${referee.id}`}>
                    {referee.availableDays.map((d) => <option key={d} value={d} />)}
                  </datalist>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Disp.: {referee.availableDays.map((d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })).join(", ")}
                  </p>
                </div>
                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Horário</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={hireTime}
                    onChange={(e) => setHireTime(e.target.value)}
                  >
                    {referee.availableTimes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Mensagem (opcional)</Label>
                <Input
                  placeholder="Local, formato do jogo, observações..."
                  value={hireMsg}
                  onChange={(e) => setHireMsg(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHireOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button
              className="bg-referee text-referee-foreground hover:bg-referee/90"
              onClick={submitHire}
              disabled={!canHire || submitting}
            >
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "confirmed" | "cancelled" }) {
  const map = {
    pending: { label: "Pendente", cls: "border-warning/50 text-warning" },
    confirmed: { label: "Confirmada", cls: "border-success/50 text-success" },
    cancelled: { label: "Cancelada", cls: "border-destructive/50 text-destructive" },
  } as const;
  const it = map[status];
  return <Badge variant="outline" className={cn("text-[10px]", it.cls)}>{it.label}</Badge>;
}

