import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Loader2,
  Save,
  DollarSign,
  CalendarDays,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel do Proprietário — PeladaPro" },
      {
        name: "description",
        content:
          "Gerencie preços, disponibilidade e reservas recebidas para cada um dos seus campos.",
      },
    ],
  }),
  component: OwnerPanel,
});

type SubFieldType = "society" | "areia" | "sintetico" | "salao";
type SubField = {
  id: string;
  venue_id: string;
  name: string;
  field_type: SubFieldType;
  price_per_hour: number;
  available_days: string[];
  available_times: string[];
  photo_url: string | null;
  active: boolean;
};

type Booking = {
  id: string;
  sub_field_id: string | null;
  field_id: string;
  requester_user_id: string;
  requester_team_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  message: string | null;
  created_at: string;
};

const WEEKDAYS = [
  { id: "mon", label: "Seg" },
  { id: "tue", label: "Ter" },
  { id: "wed", label: "Qua" },
  { id: "thu", label: "Qui" },
  { id: "fri", label: "Sex" },
  { id: "sat", label: "Sáb" },
  { id: "sun", label: "Dom" },
];

// Slots de 1 hora cobrindo o dia comercial típico
const HOUR_SLOTS = Array.from({ length: 18 }, (_, i) => {
  const h = (6 + i).toString().padStart(2, "0");
  return `${h}:00`;
});

const TYPE_LABEL: Record<SubFieldType, string> = {
  society: "Society",
  areia: "Areia",
  sintetico: "Sintético",
  salao: "Salão",
};

function OwnerPanel() {
  const { session, accountType, loading } = useAuth();
  const navigate = useNavigate();
  const [subFields, setSubFields] = useState<SubField[]>([]);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/auth", search: { redirect: "/painel" } });
      return;
    }
    if (!isBusinessAccount(accountType)) {
      toast.error("Apenas contas Business têm acesso ao Painel.");
      navigate({ to: "/" });
    }
  }, [session, accountType, loading, navigate]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoadingData(true);
    const { data: venues } = await supabase
      .from("venues" as never)
      .select("id")
      .eq("owner_user_id", session.user.id)
      .order("created_at")
      .limit(1);
    const v = (venues as { id: string }[] | null)?.[0];
    if (!v) {
      setVenueId(null);
      setSubFields([]);
      setBookings([]);
      setLoadingData(false);
      return;
    }
    setVenueId(v.id);

    const { data: sfs } = await supabase
      .from("sub_fields" as never)
      .select("*")
      .eq("venue_id", v.id)
      .order("created_at");
    const list = (sfs as SubField[] | null) ?? [];
    setSubFields(list);
    if (list.length && !activeTab) setActiveTab(list[0].id);

    const ids = list.map((s) => s.id);
    if (ids.length) {
      const { data: bks } = await supabase
        .from("bookings" as never)
        .select("*")
        .in("sub_field_id", ids)
        .order("scheduled_at", { ascending: false });
      setBookings((bks as Booking[] | null) ?? []);
    } else {
      setBookings([]);
    }
    setLoadingData(false);
  }, [session, activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || loadingData) {
    return (
      <div className="mx-auto max-w-6xl py-10">
        <Card className="flex items-center justify-center p-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando painel…
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-6">
      <header>
        <div className="flex items-center gap-2 text-muted-foreground">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-wider">
            Perfil Business
          </span>
        </div>
        <h1 className="mt-1 font-display text-3xl uppercase tracking-wider sm:text-4xl">
          Painel do <span className="text-gradient-primary">Proprietário</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Controle preços, horários disponíveis e reservas recebidas em cada um
          dos seus campos.
        </p>
      </header>

      {!venueId ? (
        <Card className="space-y-3 p-8 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="font-display text-xl uppercase">Nenhum complexo ainda</h2>
          <p className="text-sm text-muted-foreground">
            Cadastre seu complexo e seus campos para usar o painel.
          </p>
          <Button asChild className="bg-gradient-primary text-primary-foreground">
            <Link to="/complexo">Ir para Meu Complexo</Link>
          </Button>
        </Card>
      ) : subFields.length === 0 ? (
        <Card className="space-y-3 p-8 text-center">
          <h2 className="font-display text-xl uppercase">Nenhum campo cadastrado</h2>
          <p className="text-sm text-muted-foreground">
            Adicione campos físicos no seu complexo para começar.
          </p>
          <Button asChild className="bg-gradient-primary text-primary-foreground">
            <Link to="/complexo">Adicionar campos</Link>
          </Button>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-card p-1">
            {subFields.map((sf) => (
              <TabsTrigger
                key={sf.id}
                value={sf.id}
                className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground"
              >
                {sf.name}
                <span className="ml-2 text-[10px] font-mono opacity-70">
                  {TYPE_LABEL[sf.field_type]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {subFields.map((sf) => (
            <TabsContent key={sf.id} value={sf.id} className="mt-4">
              <SubFieldPanel
                sf={sf}
                bookings={bookings.filter((b) => b.sub_field_id === sf.id)}
                onChanged={load}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function SubFieldPanel({
  sf,
  bookings,
  onChanged,
}: {
  sf: SubField;
  bookings: Booking[];
  onChanged: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"price" | "calendar" | "bookings">("price");
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <Card className="border-border bg-card p-5">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="bg-surface">
          <TabsTrigger value="price">
            <DollarSign className="mr-1 h-4 w-4" /> Preço
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarDays className="mr-1 h-4 w-4" /> Disponibilidade
          </TabsTrigger>
          <TabsTrigger value="bookings">
            <Inbox className="mr-1 h-4 w-4" /> Reservas
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-primary text-primary-foreground">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="price" className="mt-4">
          <PriceManager sf={sf} onSaved={onChanged} />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <CalendarManager sf={sf} onSaved={onChanged} />
        </TabsContent>
        <TabsContent value="bookings" className="mt-4">
          <BookingsList bookings={bookings} onChanged={onChanged} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function PriceManager({ sf, onSaved }: { sf: SubField; onSaved: () => Promise<void> }) {
  const [price, setPrice] = useState<number>(sf.price_per_hour);
  const [active, setActive] = useState(sf.active);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setPrice(sf.price_per_hour);
    setActive(sf.active);
  }, [sf]);

  const dirty = price !== sf.price_per_hour || active !== sf.active;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("sub_fields" as never)
      .update({ price_per_hour: Number(price) || 0, active } as never)
      .eq("id", sf.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Preço atualizado.");
      await onSaved();
    }
    setSaving(false);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label>Preço por hora (R$)</Label>
        <div className="relative mt-1">
          <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="number"
            min={0}
            step="0.01"
            className="pl-9"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Valor cobrado por hora reservada neste campo.
        </p>
      </div>
      <div className="flex flex-col justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Campo ativo (disponível para reservas)
        </label>
        <Button
          onClick={save}
          disabled={!dirty || saving}
          className="self-end bg-gradient-primary text-primary-foreground"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}

function CalendarManager({ sf, onSaved }: { sf: SubField; onSaved: () => Promise<void> }) {
  const [days, setDays] = useState<string[]>(sf.available_days);
  const [times, setTimes] = useState<string[]>(sf.available_times);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDays(sf.available_days);
    setTimes(sf.available_times);
  }, [sf]);

  const dirty =
    JSON.stringify(days.slice().sort()) !== JSON.stringify(sf.available_days.slice().sort()) ||
    JSON.stringify(times.slice().sort()) !== JSON.stringify(sf.available_times.slice().sort());

  const toggle = (set: string[], v: string, setter: (n: string[]) => void) => {
    const s = new Set(set);
    s.has(v) ? s.delete(v) : s.add(v);
    setter(Array.from(s));
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("sub_fields" as never)
      .update({ available_days: days, available_times: times } as never)
      .eq("id", sf.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Disponibilidade atualizada.");
      await onSaved();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-2 block">Dias da semana</Label>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d) => {
            const on = days.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => toggle(days, d.id, setDays)}
                className={`rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition ${
                  on
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Slots de 1h disponíveis</Label>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTimes(HOUR_SLOTS)}
            >
              Selecionar todos
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setTimes([])}>
              Limpar
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 md:grid-cols-9">
          {HOUR_SLOTS.map((t) => {
            const on = times.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggle(times, t, setTimes)}
                className={`rounded-md border px-2 py-1.5 text-xs font-mono transition ${
                  on
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Cada slot representa uma hora de reserva. Times só conseguirão reservar
          dentro dos horários e dias marcados.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={!dirty || saving}
          className="bg-gradient-primary text-primary-foreground"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar disponibilidade
        </Button>
      </div>
    </div>
  );
}

function BookingsList({
  bookings,
  onChanged,
}: {
  bookings: Booking[];
  onChanged: () => Promise<void>;
}) {
  const [requesterNames, setRequesterNames] = useState<Record<string, string>>({});
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const userIds = Array.from(new Set(bookings.map((b) => b.requester_user_id)));
    const teamIds = Array.from(
      new Set(bookings.map((b) => b.requester_team_id).filter(Boolean) as string[]),
    );
    (async () => {
      if (userIds.length) {
        const { data } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);
        const map: Record<string, string> = {};
        (data ?? []).forEach((p) => (map[p.id] = p.display_name ?? "Usuário"));
        setRequesterNames(map);
      }
      if (teamIds.length) {
        const { data } = await supabase
          .from("teams")
          .select("id, name")
          .in("id", teamIds);
        const map: Record<string, string> = {};
        (data ?? []).forEach((t) => (map[t.id] = t.name));
        setTeamNames(map);
      }
    })();
  }, [bookings]);

  const grouped = useMemo(() => {
    const pending = bookings.filter((b) => b.status === "pending");
    const others = bookings.filter((b) => b.status !== "pending");
    return { pending, others };
  }, [bookings]);

  const setStatus = async (id: string, status: "accepted" | "rejected") => {
    setUpdating(id);
    const { error } = await supabase
      .from("bookings" as never)
      .update({ status } as never)
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(status === "accepted" ? "Reserva aceita." : "Reserva recusada.");
      await onChanged();
    }
    setUpdating(null);
  };

  if (!bookings.length) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Nenhuma reserva recebida para este campo ainda.
      </div>
    );
  }

  const Row = ({ b }: { b: Booking }) => {
    const date = new Date(b.scheduled_at);
    const team = b.requester_team_id ? teamNames[b.requester_team_id] : null;
    const who = team ?? requesterNames[b.requester_user_id] ?? "Solicitante";
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm uppercase tracking-wide">
              {who}
            </span>
            <StatusBadge status={b.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {date.toLocaleString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {b.duration_minutes} min
            </span>
          </div>
          {b.message && (
            <p className="max-w-xl text-xs text-muted-foreground">"{b.message}"</p>
          )}
        </div>
        {b.status === "pending" && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={updating === b.id}
              onClick={() => setStatus(b.id, "rejected")}
            >
              <XCircle className="mr-1 h-4 w-4" /> Recusar
            </Button>
            <Button
              size="sm"
              disabled={updating === b.id}
              onClick={() => setStatus(b.id, "accepted")}
              className="bg-gradient-primary text-primary-foreground"
            >
              <CheckCircle2 className="mr-1 h-4 w-4" /> Aceitar
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {grouped.pending.length > 0 && (
        <section>
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Pendentes ({grouped.pending.length})
          </h3>
          <div className="space-y-2">
            {grouped.pending.map((b) => (
              <Row key={b.id} b={b} />
            ))}
          </div>
        </section>
      )}
      {grouped.others.length > 0 && (
        <section>
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Histórico
          </h3>
          <div className="space-y-2">
            {grouped.others.map((b) => (
              <Row key={b.id} b={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pendente", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
    accepted: { label: "Aceita", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
    rejected: { label: "Recusada", cls: "bg-red-500/15 text-red-500 border-red-500/30" },
    cancelled: { label: "Cancelada", cls: "bg-muted text-muted-foreground border-border" },
  };
  const v = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase ${v.cls}`}>
      {v.label}
    </span>
  );
}
