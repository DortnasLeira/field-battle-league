import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Users, User, MapPin, Star, Eye, Lock, Flag as Whistle, Calendar, Clock, DollarSign, Award, Lock as LockIcon, Swords } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import { FiltersPanel } from "@/components/FiltersPanel";
import { TeamBadge } from "@/components/TeamBadge";
import { teams as mockTeams, referees as mockReferees, matches as mockMatches, type Referee } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, frameClass, type UserProfile } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CityCombobox, normalizeCity } from "@/components/CityCombobox";

export const Route = createFileRoute("/buscar")({
  head: () => ({
    meta: [
      { title: "Buscar — PeladaPro" },
      { name: "description", content: "Procure times, jogadores e árbitros na sua região." },
    ],
  }),
  component: BuscarPage,
});

type Kind = "all" | "players" | "teams" | "referees";

const ALL_POSITIONS = ["Goleiro", "Zagueiro", "Lateral", "Volante", "Meia", "Atacante"];
const ALL_LEVELS = ["Iniciante", "Intermediário", "Avançado"];

function BuscarPage() {
  const [kind, setKind] = useState<Kind>("all");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [position, setPosition] = useState<string>("");
  const [level, setLevel] = useState<string>("");

  // Referee filters
  const [refMaxPrice, setRefMaxPrice] = useState<string>("");
  const [refMinScore, setRefMinScore] = useState<string>("");
  const [refDate, setRefDate] = useState<string>("");
  const [refTime, setRefTime] = useState<string>("");

  const [players, setPlayers] = useState<UserProfile[]>([]);
  const { session, activeProfile } = useAuth();
  const navigate = useNavigate();
  const requireLogin = () => {
    toast.error("Faça login para ver o perfil.");
    navigate({ to: "/auth", search: { redirect: window.location.pathname } });
  };

  useEffect(() => {
    supabase
      .from("user_profiles")
      .select("*")
      .eq("type", "player")
      .then(({ data }) => setPlayers((data ?? []) as UserProfile[]));
  }, []);

  // Auto-geolocation: prefill city from active profile
  useEffect(() => {
    if (!city && activeProfile?.city) setCity(activeProfile.city);
  }, [activeProfile]);

  const q = query.trim().toLowerCase();
  const cityKey = normalizeCity(city);

  const filteredTeams = useMemo(() => {
    return mockTeams.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q) && !t.captain.toLowerCase().includes(q)) return false;
      if (cityKey && !normalizeCity(t.city).includes(cityKey)) return false;
      return true;
    });
  }, [q, cityKey]);

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const nick = (p.nickname || "").toLowerCase();
      if (q && !name.includes(q) && !nick.includes(q)) return false;
      if (cityKey && !normalizeCity(p.city).includes(cityKey)) return false;
      if (position && p.position !== position) return false;
      if (level && p.level !== level) return false;
      return true;
    });
  }, [players, q, cityKey, position, level]);

  const filteredReferees = useMemo(() => {
    return mockReferees.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false;
      if (cityKey && !normalizeCity(r.city).includes(cityKey)) return false;
      if (refMaxPrice && r.pricePerGame > Number(refMaxPrice)) return false;
      if (refMinScore && r.score < Number(refMinScore)) return false;
      if (refDate && !r.availableDays.includes(refDate)) return false;
      if (refTime && !r.availableTimes.includes(refTime)) return false;
      return true;
    });
  }, [q, cityKey, refMaxPrice, refMinScore, refDate, refTime]);

  const isReferees = kind === "referees";
  const filterCount = isReferees
    ? [city, refMaxPrice, refMinScore, refDate, refTime].filter(Boolean).length
    : [city, position, level].filter(Boolean).length;

  const clear = () => {
    setCity("");
    setPosition("");
    setLevel("");
    setRefMaxPrice("");
    setRefMinScore("");
    setRefDate("");
    setRefTime("");
  };

  const showTeams = kind === "all" || kind === "teams";
  const showPlayers = kind === "all" || kind === "players";
  const showReferees = kind === "all" || kind === "referees";

  // Hire dialog
  const [hireRef, setHireRef] = useState<Referee | null>(null);
  const canHire = activeProfile?.type === "team" || activeProfile?.type === "field";

  const onHireClick = (r: Referee) => {
    if (!session) return requireLogin();
    if (!canHire) {
      toast.error("Apenas perfis TIME ou CAMPO podem contratar árbitros.");
      return;
    }
    setHireRef(r);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">Buscar</h1>
        <p className="text-sm text-muted-foreground">Encontre times, jogadores e árbitros pelo nome.</p>
      </div>

      <Card className="border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite o nome do jogador, time ou árbitro..."
              className="pl-9"
            />
          </div>
          <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
            <TabsList>
              <TabsTrigger value="all">Tudo</TabsTrigger>
              <TabsTrigger value="players"><User className="mr-1 h-3.5 w-3.5" /> Jogadores</TabsTrigger>
              <TabsTrigger value="teams"><Users className="mr-1 h-3.5 w-3.5" /> Times</TabsTrigger>
              <TabsTrigger value="referees"><Whistle className="mr-1 h-3.5 w-3.5" /> Árbitros</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-3">
          <FiltersPanel count={filterCount} onClear={clear}>
            {isReferees ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <MapPin className="mr-0.5 inline h-3 w-3" /> Cidade {activeProfile?.city && city === activeProfile.city && <span className="text-primary">(auto)</span>}
                  </Label>
                  <div className="mt-1"><CityCombobox value={city} onChange={setCity} placeholder="Sua cidade" /></div>
                </div>
                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <DollarSign className="mr-0.5 inline h-3 w-3" /> Preço máx. por jogo
                  </Label>
                  <Input type="number" value={refMaxPrice} onChange={(e) => setRefMaxPrice(e.target.value)} placeholder="R$ 200" className="mt-1" />
                </div>
                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Star className="mr-0.5 inline h-3 w-3" /> Score mínimo
                  </Label>
                  <select value={refMinScore} onChange={(e) => setRefMinScore(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="">Qualquer</option>
                    <option value="3">3.0+</option>
                    <option value="4">4.0+</option>
                    <option value="4.5">4.5+</option>
                    <option value="4.8">4.8+</option>
                  </select>
                </div>
                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Calendar className="mr-0.5 inline h-3 w-3" /> Data
                  </Label>
                  <Input type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Clock className="mr-0.5 inline h-3 w-3" /> Horário
                  </Label>
                  <Input type="time" value={refTime} onChange={(e) => setRefTime(e.target.value)} className="mt-1" />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Cidade</Label>
                  <div className="mt-1"><CityCombobox value={city} onChange={setCity} placeholder="Ex: São Paulo/SP" /></div>
                </div>
                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Posição</Label>
                  <select value={position} onChange={(e) => setPosition(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="">Todas</option>
                    {ALL_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Nível</Label>
                  <select value={level} onChange={(e) => setLevel(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="">Todos</option>
                    {ALL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            )}
          </FiltersPanel>
        </div>
      </Card>

      {showPlayers && (
        <section>
          <SectionHeader icon={<User className="h-4 w-4" />} title="Jogadores" count={filteredPlayers.length} />
          {filteredPlayers.length === 0 ? (
            <EmptyState text="Nenhum jogador encontrado." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPlayers.map((p) => (
                <PlayerCard
                  key={p.id}
                  p={p}
                  onView={() => (session ? navigate({ to: "/jogador/$id", params: { id: p.id } }) : requireLogin())}
                  locked={!session}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {showTeams && (
        <section>
          <SectionHeader icon={<Users className="h-4 w-4" />} title="Times" count={filteredTeams.length} />
          {filteredTeams.length === 0 ? (
            <EmptyState text="Nenhum time encontrado." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTeams.map((t) => {
                const yr = new Date().getFullYear();
                const played = mockMatches.filter(
                  (m) => m.status === "completed" && (m.homeId === t.id || m.awayId === t.id) && new Date(m.date).getFullYear() === yr,
                );
                let w = 0, d = 0;
                played.forEach((m) => {
                  const home = m.homeId === t.id;
                  const my = home ? m.homeScore! : m.awayScore!;
                  const opp = home ? m.awayScore! : m.homeScore!;
                  if (my > opp) w++; else if (my === opp) d++;
                });
                const pct = played.length ? Math.round(((w * 3 + d) / (played.length * 3)) * 100) : 0;
                const fieldLabel = t.preferredFieldName || "VISITANTE";
                return (
                  <Card key={t.id} className="flex flex-col gap-3 border-border bg-card p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-xl ring-1 ring-border">
                        <span>{t.shield}</span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Linha 1: nome */}
                        <div className="font-display text-base uppercase tracking-wide truncate">{t.name}</div>
                        {/* Linha 2: cidade · aproveitamento · desde */}
                        <div className="flex flex-wrap items-center gap-x-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                          <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {t.city}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5 text-foreground">
                            {played.length ? `${pct}% em ${yr}` : `Sem jogos em ${yr}`}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5"><Calendar className="h-3 w-3" /> Desde {t.founded}</span>
                        </div>
                        {/* Linha 3: nota · campo preferido */}
                        <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
                          {typeof t.rating === "number" && (
                            <span className="inline-flex items-center gap-0.5 text-primary">
                              <Star className="h-3 w-3 fill-current" /> {t.rating.toFixed(1)}
                              {t.reviews ? <span className="text-muted-foreground">({t.reviews})</span> : null}
                            </span>
                          )}
                          <span className="text-muted-foreground">·</span>
                          <span className={cn(
                            "inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider",
                            t.preferredFieldName ? "text-foreground" : "text-primary",
                          )}>
                            <Star className="h-3 w-3" /> {fieldLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => (session ? navigate({ to: "/time/$id", params: { id: t.id } }) : requireLogin())}
                        title={!session ? "Faça login para ver o perfil" : "Ver perfil"}
                      >
                        {session ? <Eye className="mr-1 h-3.5 w-3.5" /> : <Lock className="mr-1 h-3.5 w-3.5" />}
                        Perfil
                      </Button>
                      <Button
                        size="sm"
                        className="bg-gradient-primary text-primary-foreground"
                        onClick={() => {
                          if (!session) return requireLogin();
                          if (activeProfile?.type !== "team") {
                            toast.error("Apenas perfis de Time podem desafiar outro time.");
                            return;
                          }
                          navigate({ to: "/desafios", search: { opponent: t.id } });
                        }}
                        title="Desafiar este time"
                      >
                        <Swords className="mr-1 h-3.5 w-3.5" /> Desafiar
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {showReferees && (
        <section>
          <SectionHeader icon={<Whistle className="h-4 w-4" />} title="Árbitros" count={filteredReferees.length} />
          {filteredReferees.length === 0 ? (
            <EmptyState text="Nenhum árbitro encontrado com esses filtros." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredReferees.map((r) => (
                <RefereeCard
                  key={r.id}
                  r={r}
                  canHire={!!canHire}
                  authed={!!session}
                  onHire={() => onHireClick(r)}
                  onView={() => navigate({ to: "/arbitro/$id", params: { id: r.id } })}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <Dialog open={!!hireRef} onOpenChange={(o) => !o && setHireRef(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wide">Contratar árbitro</DialogTitle>
            <DialogDescription>
              Inicie o agendamento com <strong>{hireRef?.name}</strong> ({hireRef?.city}). Valor: R$ {hireRef?.pricePerGame} / jogo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Data</Label>
                <Input type="date" defaultValue={refDate || hireRef?.availableDays[0]} />
              </div>
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Horário</Label>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" defaultValue={refTime}>
                  {hireRef?.availableTimes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Mensagem (opcional)</Label>
              <Input placeholder="Local, formato do jogo, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHireRef(null)}>Cancelar</Button>
            <Button onClick={() => { toast.success("Solicitação enviada ao árbitro!"); setHireRef(null); }}>
              Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function PlayerCard({ p, onView, locked }: { p: UserProfile; onView: () => void; locked: boolean }) {
  const initials = (p.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <Card className="flex items-center gap-3 border-border bg-card p-4">
      <div
        className={cn("flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl text-xl", frameClass(p.frame))}
        style={{ background: p.color + "22", color: p.color }}
      >
        {p.photo_url ? (
          <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
        ) : (
          <span className="font-display">{initials || p.avatar || "⚽"}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-base uppercase tracking-wide truncate">{p.name}</div>
        {p.nickname && <div className="text-xs text-muted-foreground truncate">"{p.nickname}"</div>}
        <div className="mt-1 flex flex-wrap gap-1">
          {p.position && <Badge variant="outline" className="border-primary/40 text-primary">{p.position}</Badge>}
          {p.level && <Badge variant="outline" className="border-border">{p.level}</Badge>}
        </div>
        {p.city && (
          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <MapPin className="mr-0.5 inline h-3 w-3" /> {p.city}
          </div>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={onView} title={locked ? "Faça login para ver o perfil" : "Ver perfil"}>
        {locked ? <Lock className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}
        Perfil
      </Button>
    </Card>
  );
}

function RefereeCard({ r, canHire, authed, onHire, onView }: { r: Referee; canHire: boolean; authed: boolean; onHire: () => void; onView: () => void }) {
  return (
    <Card className="flex flex-col gap-3 border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl">
          {r.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-display text-base uppercase tracking-wide truncate">{r.name}</div>
            {r.certifications.length > 0 && (
              <div className="flex flex-wrap justify-end gap-1 shrink-0">
                {r.certifications.map((c) => (
                  <Badge key={c} variant="outline" className="border-primary/40 text-primary text-[10px]">
                    <Award className="mr-0.5 h-2.5 w-2.5" />{c}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">
            <MapPin className="mr-0.5 inline h-3 w-3" /> {r.city} · {r.experienceYears}a exp.
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-0.5 text-primary">
              <Star className="h-3 w-3 fill-current" /> {r.score.toFixed(1)}
              <span className="text-muted-foreground">({r.reviews})</span>
            </span>
            <span className="inline-flex items-center gap-0.5 font-mono text-[11px]">
              <DollarSign className="h-3 w-3" />R$ {r.pricePerGame}/jogo
            </span>
          </div>
        </div>

      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={onView}
        >
          <Eye className="mr-1 h-3.5 w-3.5" /> Perfil
        </Button>
        <Button
          size="sm"
          className="flex-1"
          disabled={authed && !canHire}
          onClick={onHire}
          title={!authed ? "Faça login" : !canHire ? "Apenas perfis TIME ou CAMPO podem contratar" : "Solicitar contratação"}
        >
          {!canHire && authed ? <LockIcon className="mr-1 h-3.5 w-3.5" /> : <Whistle className="mr-1 h-3.5 w-3.5" />}
          Contratar
        </Button>
      </div>
      {authed && !canHire && (
        <p className="text-[10px] text-muted-foreground">
          Troque para um perfil de <strong>Time</strong> ou <strong>Campo</strong> para contratar.
        </p>
      )}
    </Card>
  );
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon}
      <h2 className="font-display text-lg uppercase tracking-wide">{title}</h2>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">({count})</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
      {text}
    </Card>
  );
}
