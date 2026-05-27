import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, Building2, Clock, ChevronRight, Loader2, Lock, CheckCircle2, CalendarDays, Sun, Sunset, Moon, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CityCombobox } from "@/components/CityCombobox";
import { FiltersPanel } from "@/components/FiltersPanel";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BookingStripeCheckout } from "@/components/BookingStripeCheckout";
import { computeSlotPrice, describeRule, type PricingRule } from "@/lib/pricing";
import { dayIdFor } from "@/lib/pricing";

export const Route = createFileRoute("/campos")({
  head: () => ({
    meta: [
      { title: "Campos — PeladaPro" },
      { name: "description", content: "Reserve sub-campos por hora com pagamento seguro." },
    ],
  }),
  component: CamposPage,
});

type Venue = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  bio: string | null;
  photo_url: string | null;
};

type SubField = {
  id: string;
  venue_id: string;
  name: string;
  field_type: "society" | "areia" | "sintetico" | "salao";
  price_per_hour: number;
  available_days: string[];
  available_times: string[];
  pricing_rules: PricingRule[];
  photo_url: string | null;
  active: boolean;
};

const TYPE_LABEL: Record<SubField["field_type"], string> = {
  society: "Society",
  areia: "Areia",
  sintetico: "Sintético",
  salao: "Salão",
};

type Period = "morning" | "afternoon" | "night";
const PERIODS: { id: Period; label: string; range: [string, string]; icon: typeof Sun }[] = [
  { id: "morning", label: "Manhã (08:00–12:00)", range: ["08:00", "12:00"], icon: Sun },
  { id: "afternoon", label: "Tarde (12:00–18:00)", range: ["12:00", "18:00"], icon: Sunset },
  { id: "night", label: "Noite (18:00–23:00)", range: ["18:00", "23:00"], icon: Moon },
];

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

function CamposPage() {
  const { session, activeProfile } = useAuth();
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [allSubFields, setAllSubFields] = useState<SubField[]>([]);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const [period, setPeriod] = useState<Period | "">("");
  const [time, setTime] = useState("");
  const [bookedKeys, setBookedKeys] = useState<Set<string>>(new Set());
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [initialSlot, setInitialSlot] = useState<{ date: string; time: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from("venues").select("id, name, city, address, bio, photo_url").order("name"),
      supabase.from("sub_fields")
        .select("id, venue_id, name, field_type, price_per_hour, available_days, available_times, pricing_rules, photo_url, active")
        .eq("active", true),
    ]).then(([v, s]) => {
      setVenues((v.data ?? []) as Venue[]);
      setAllSubFields((s.data ?? []) as SubField[]);
      setLoading(false);
    });
  }, []);

  // Carrega bookings confirmados (ou pendentes recentes) para a data escolhida
  useEffect(() => {
    if (!date) { setBookedKeys(new Set()); return; }
    setBookingsLoading(true);
    const start = new Date(`${date}T00:00:00`).toISOString();
    const end = new Date(`${date}T23:59:59`).toISOString();
    supabase
      .from("bookings")
      .select("sub_field_id, scheduled_at, status, created_at")
      .gte("scheduled_at", start)
      .lte("scheduled_at", end)
      .then(({ data }) => {
        const keys = new Set<string>();
        const fiveMinAgo = Date.now() - 5 * 60_000;
        (data ?? []).forEach((b) => {
          if (!b.sub_field_id) return;
          const isBlocking =
            b.status === "confirmed" ||
            (b.status === "pending" && new Date(b.created_at).getTime() > fiveMinAgo);
          if (!isBlocking) return;
          const d = new Date(b.scheduled_at);
          const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          keys.add(`${b.sub_field_id}|${hhmm}`);
        });
        setBookedKeys(keys);
        setBookingsLoading(false);
      });
  }, [date]);

  const availabilityActive = !!date && (!!period || !!time);

  const availableVenueIds = useMemo(() => {
    if (!availabilityActive) return null;
    const dayId = dayIdFor(new Date(`${date}T12:00:00`));
    let win: [number, number] | null = null;
    if (time) {
      const t = toMin(time);
      win = [t, t + 1]; // exato
    } else if (period) {
      const p = PERIODS.find((x) => x.id === period)!;
      win = [toMin(p.range[0]), toMin(p.range[1])];
    }
    const ok = new Set<string>();
    for (const sf of allSubFields) {
      if (!sf.available_days?.includes(dayId)) continue;
      const slots = sf.available_times?.length ? sf.available_times : [];
      const candidate = slots.filter((t) => {
        const m = toMin(t);
        return win![0] <= m && m < win![1];
      });
      // Se filtra por horário exato e o campo não publica slots, ainda assim aceita
      const effective = time && candidate.length === 0 && slots.length === 0 ? [time] : candidate;
      const free = effective.some((t) => !bookedKeys.has(`${sf.id}|${t}`));
      if (free) ok.add(sf.venue_id);
    }
    return ok;
  }, [availabilityActive, allSubFields, bookedKeys, date, period, time]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return venues.filter((v) => {
      if (q && !v.name.toLowerCase().includes(q) && !(v.address ?? "").toLowerCase().includes(q)) return false;
      if (city && !(v.city ?? "").toLowerCase().includes(city.toLowerCase())) return false;
      if (availableVenueIds && !availableVenueIds.has(v.id)) return false;
      return true;
    });
  }, [venues, query, city, availableVenueIds]);

  const filtersCount = (city ? 1 : 0) + (date ? 1 : 0) + (period ? 1 : 0) + (time ? 1 : 0);

  const clearAll = () => { setCity(""); setDate(""); setPeriod(""); setTime(""); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">Campos</h1>
        <p className="text-sm text-muted-foreground">
          Escolha um estabelecimento, depois um campo e horário. Pagamento processado na hora.
        </p>
      </div>

      <Card className="space-y-3 border-border bg-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome do estabelecimento ou endereço..."
            className="pl-9"
          />
        </div>

        <FiltersPanel count={filtersCount} onClear={clearAll}>
          <div className="space-y-4">
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Cidade
              </Label>
              <div className="mt-1">
                <CityCombobox value={city} onChange={setCity} placeholder="Cidade" />
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-display uppercase tracking-wider text-primary">
                <CalendarDays className="h-3.5 w-3.5" />
                Disponibilidade
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Data
                  </Label>
                  <Input
                    type="date"
                    value={date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Horário preferido
                  </Label>
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    {PERIODS.map((p) => {
                      const Icon = p.icon;
                      const active = period === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setPeriod(active ? "" : p.id); setTime(""); }}
                          className={`flex flex-col items-center justify-center gap-0.5 rounded-md border px-2 py-1.5 text-[10px] uppercase tracking-wide transition ${
                            active
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                          title={p.label}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {p.id === "morning" ? "Manhã" : p.id === "afternoon" ? "Tarde" : "Noite"}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Clock className="mr-1 inline h-3 w-3" /> Horário exato (opcional)
                  </Label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => { setTime(e.target.value); if (e.target.value) setPeriod(""); }}
                    className="mt-1"
                    disabled={!date}
                  />
                </div>
              </div>
              {date && !period && !time && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Selecione um período ou horário exato para filtrar campos disponíveis.
                </p>
              )}
            </div>
          </div>
        </FiltersPanel>
      </Card>


      {loading ? (
        <div className="flex justify-center p-10 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : bookingsLoading && availabilityActive ? (
        <div className="flex justify-center p-10 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {availabilityActive
            ? "Nenhum campo disponível para a data e horário selecionados."
            : "Nenhum estabelecimento encontrado."}
        </Card>
      ) : (
        <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((v) => (
            <VenueCard
              key={v.id}
              venue={v}
              onOpen={() => {
                setInitialSlot(date && (time || period) ? { date, time } : null);
                setSelectedVenue(v);
              }}
            />
          ))}
        </div>
      )}

      <Dialog open={!!selectedVenue} onOpenChange={(o) => !o && setSelectedVenue(null)}>
        <DialogContent className="max-w-3xl">
          {selectedVenue && (
            <VenueSubFields
              venue={selectedVenue}
              initialSlot={initialSlot}
              onClose={() => setSelectedVenue(null)}
              authed={!!session}
              canBook={activeProfile?.type === "player" || activeProfile?.type === "team"}
              onLogin={() => {
                setSelectedVenue(null);
                navigate({ to: "/auth", search: { redirect: "/campos" } });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VenueCard({ venue, onOpen }: { venue: Venue; onOpen: () => void }) {
  const address = venue.address?.trim() ? venue.address : "Não definido";
  return (
    <Card className="flex h-full min-h-[280px] flex-col overflow-hidden border-border bg-card p-0">
      <div className="relative h-28 flex-shrink-0 bg-gradient-primary/40">
        {venue.photo_url ? (
          <img src={venue.photo_url} alt={venue.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/60">
            <Building2 className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="line-clamp-2 font-display text-lg uppercase tracking-wide">{venue.name}</div>
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <span className={`line-clamp-2 ${venue.address?.trim() ? "" : "italic opacity-70"}`}>
            {address}
          </span>
        </div>
        <div className="mt-auto pt-2">
          <Button onClick={onOpen} variant="outline" size="sm" className="w-full">
            Ver campos disponíveis <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function VenueSubFields({
  venue,
  initialSlot,
  onClose,
  authed,
  canBook,
  onLogin,
}: {
  venue: Venue;
  initialSlot?: { date: string; time: string } | null;
  onClose: () => void;
  authed: boolean;
  canBook: boolean;
  onLogin: () => void;
}) {
  const [subFields, setSubFields] = useState<SubField[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SubField | null>(null);
  const [date, setDate] = useState(initialSlot?.date ?? "");
  const [time, setTime] = useState(initialSlot?.time ?? "");
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("sub_fields")
      .select("id, venue_id, name, field_type, price_per_hour, available_days, available_times, pricing_rules, photo_url, active")
      .eq("venue_id", venue.id)
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        setSubFields((data ?? []) as SubField[]);
        setLoading(false);
      });
  }, [venue.id]);

  const scheduledAt = useMemo(() => {
    if (!date || !time) return "";
    return new Date(`${date}T${time}:00`).toISOString();
  }, [date, time]);

  const priced = useMemo(() => {
    if (!selected || !scheduledAt) return null;
    return computeSlotPrice(Number(selected.price_per_hour), selected.pricing_rules ?? [], scheduledAt);
  }, [selected, scheduledAt]);

  // ───── Trava de disponibilidade em tempo real ─────
  // "unknown" enquanto consulta; "available" libera o checkout; "locked" bloqueia.
  const [availability, setAvailability] = useState<"unknown" | "checking" | "available" | "locked">("unknown");

  useEffect(() => {
    if (!selected || !scheduledAt) { setAvailability("unknown"); return; }
    let cancelled = false;
    setAvailability("checking");
    supabase
      .rpc("is_sub_field_slot_available" as never, {
        _sub_field_id: selected.id,
        _scheduled_at: scheduledAt,
      } as never)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setAvailability("unknown"); return; }
        setAvailability(data ? "available" : "locked");
      });
    // Re-checa a cada 20s caso o slot acabe de ser bloqueado por outra pessoa
    const id = window.setInterval(() => {
      supabase
        .rpc("is_sub_field_slot_available" as never, {
          _sub_field_id: selected.id,
          _scheduled_at: scheduledAt,
        } as never)
        .then(({ data, error }) => {
          if (cancelled || error) return;
          setAvailability(data ? "available" : "locked");
        });
    }, 20_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [selected?.id, scheduledAt]);

  const startCheckout = () => {
    if (!authed) return onLogin();
    if (!canBook) {
      toast.error("Apenas perfis Jogador ou Time podem reservar.");
      return;
    }
    if (!selected || !date || !time) {
      toast.error("Selecione campo, data e horário.");
      return;
    }
    if (availability === "locked") {
      toast.error("Este horário acabou de ser bloqueado por outra pessoa. Escolha outro slot.");
      return;
    }
    if (availability !== "available") {
      toast.error("Aguarde a verificação de disponibilidade.");
      return;
    }
    setShowCheckout(true);
  };

  if (showCheckout && selected && scheduledAt) {
    const final = priced?.price ?? Number(selected.price_per_hour);
    return (
      <div>
        <DialogHeader>
          <DialogTitle className="font-display uppercase">Pagamento · {selected.name}</DialogTitle>
          <DialogDescription>
            R$ {final.toFixed(2)} · {date} {time}
            {priced?.rule ? ` · ${describeRule(priced.rule)}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <BookingStripeCheckout subFieldId={selected.id} scheduledAt={scheduledAt} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DialogHeader>
        <DialogTitle className="font-display uppercase tracking-wide">{venue.name}</DialogTitle>
        <DialogDescription>
          {venue.address ?? "Selecione um campo e horário disponível."}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center p-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : subFields.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface/30 p-6 text-center text-sm text-muted-foreground">
            Este estabelecimento ainda não cadastrou campos.
          </div>
        ) : (
          subFields.map((sf) => {
            const isSelected = selected?.id === sf.id;
            return (
              <button
                key={sf.id}
                type="button"
                onClick={() => { setSelected(sf); setTime(""); }}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-display text-base uppercase tracking-wide">{sf.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="outline">{TYPE_LABEL[sf.field_type]}</Badge>
                      {sf.available_days.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {sf.available_days.length} dias/sem
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-muted-foreground">R$/h</div>
                    <div className="font-display text-xl text-primary">
                      {Number(sf.price_per_hour).toFixed(0)}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Data</Label>
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">
                        <Clock className="mr-1 inline h-3 w-3" /> Horário
                      </Label>
                      {sf.available_times.length > 0 ? (
                        <select
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                        >
                          <option value="">Escolha</option>
                          {sf.available_times.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      ) : (
                        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                      )}
                    </div>
                    {date && time && (
                      <div className="sm:col-span-2">
                        <SlotAvailabilityBadge state={availability} />
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
        <div className="text-sm text-muted-foreground">
          {selected && date && time && priced ? (
            <div className="flex flex-col">
              <span>
                Total: <strong className="text-primary">R$ {priced.price.toFixed(2)}</strong>
                {priced.rule && Number(selected.price_per_hour) !== priced.price && (
                  <span className="ml-2 text-xs text-muted-foreground line-through">
                    R$ {Number(selected.price_per_hour).toFixed(2)}
                  </span>
                )}
              </span>
              {priced.rule && (
                <span className="text-[11px] text-primary/80">
                  {describeRule(priced.rule)}
                </span>
              )}
            </div>
          ) : (
            "Escolha campo, data e horário"
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={startCheckout}
            disabled={
              !selected || !date || !time ||
              availability === "checking" || availability === "locked"
            }
            className="bg-gradient-primary text-primary-foreground"
          >
            {availability === "locked"
              ? <><Lock className="mr-1 h-4 w-4" /> Slot indisponível</>
              : availability === "checking"
                ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Verificando…</>
                : "Reservar e pagar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SlotAvailabilityBadge({ state }: { state: "unknown" | "checking" | "available" | "locked" }) {
  if (state === "checking") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Verificando disponibilidade do slot…
      </div>
    );
  }
  if (state === "available") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Horário disponível — pronto para reservar.
      </div>
    );
  }
  if (state === "locked") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <Lock className="h-3.5 w-3.5" />
        Slot bloqueado por outra pessoa. Escolha outro horário.
      </div>
    );
  }
  return null;
}
