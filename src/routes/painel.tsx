import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Plus,
  Trash2,
  ImagePlus,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProtectedAccess } from "@/lib/useProtectedAccess";
import { RouteLoadingSkeleton } from "@/components/RouteLoadingSkeleton";
import { CityCombobox } from "@/components/CityCombobox";
import type { PricingRule } from "@/lib/pricing";

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

type Venue = {
  id: string;
  owner_user_id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  bio: string | null;
  photo_url: string | null;
};

type SubField = {
  id: string;
  venue_id: string;
  name: string;
  field_type: SubFieldType;
  price_per_hour: number;
  available_days: string[];
  available_times: string[];
  pricing_rules: PricingRule[];
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

const FIELD_TYPES: { value: SubFieldType; label: string }[] = [
  { value: "society", label: "Society" },
  { value: "areia", label: "Areia" },
  { value: "sintetico", label: "Sintético" },
  { value: "salao", label: "Salão" },
];

const WEEKDAYS = [
  { id: "mon", label: "Seg" },
  { id: "tue", label: "Ter" },
  { id: "wed", label: "Qua" },
  { id: "thu", label: "Qui" },
  { id: "fri", label: "Sex" },
  { id: "sat", label: "Sáb" },
  { id: "sun", label: "Dom" },
];

const TIME_SLOTS = ["06:00","07:00","08:00","09:00","10:00","11:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"];

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
  const access = useProtectedAccess("field", {
    redirectBack: "/painel",
    deniedMessage: "Esta área é exclusiva para complexos esportivos (contas Campo).",
  });
  const { session, activeProfile } = useAuth();
  const navigate = useNavigate();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [subFields, setSubFields] = useState<SubField[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");
  const ready = access.status === "ready";

  const load = useCallback(async () => {
    if (!session?.user || !ready) {
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    let { data: venues } = await supabase
      .from("venues" as never)
      .select("*")
      .eq("owner_user_id", session.user.id)
      .order("created_at")
      .limit(1);
    let v = (venues as Venue[] | null)?.[0] ?? null;

    // Auto-cria venue caso o usuário ainda não tenha
    if (!v && activeProfile?.type === "field") {
      const { data: created, error } = await supabase
        .from("venues" as never)
        .insert({
          owner_user_id: session.user.id,
          name: activeProfile.name,
          city: activeProfile.city ?? null,
        } as never)
        .select()
        .single();
      if (!error && created) v = created as Venue;
    }

    setVenue(v);
    if (v) {
      const { data: sfs } = await supabase
        .from("sub_fields" as never)
        .select("*")
        .eq("venue_id", v.id)
        .order("created_at");
      const list = (sfs as SubField[] | null) ?? [];
      setSubFields(list);
      if (list.length && !activeTab) setActiveTab(list[0].id);

      // Carrega reservas
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
    } else {
      setSubFields([]);
      setBookings([]);
    }
    setLoadingData(false);
  }, [session, activeProfile, ready, activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  const addSubField = async () => {
    if (!venue) {
      toast.error("Estabelecimento não encontrado. Complete o onboarding.");
      return;
    }
    const { error } = await supabase
      .from("sub_fields" as never)
      .insert({
        venue_id: venue.id,
        name: `Campo ${subFields.length + 1}`,
        field_type: "society",
        price_per_hour: 0,
        available_days: [],
        available_times: [],
      } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    await load();
  };

  if (access.status === "loading") {
    return <RouteLoadingSkeleton label="Carregando painel" />;
  }

  if (loadingData) {
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
        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="font-display text-3xl uppercase tracking-wider sm:text-4xl">
            Painel do <span className="text-gradient-primary">Proprietário</span>
          </h1>
          <Button onClick={addSubField} className="bg-gradient-primary text-primary-foreground">
            <Plus className="mr-1 h-4 w-4" /> Adicionar Campo
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Controle preços, horários disponíveis e reservas recebidas em cada um dos seus campos.
        </p>
      </header>

      {!venue ? (
        <Card className="space-y-3 p-8 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="font-display text-xl uppercase">Nenhum complexo ainda</h2>
          <p className="text-sm text-muted-foreground">
            Cadastre seu complexo e seus campos para usar o painel.
          </p>
          <Button onClick={() => navigate({ to: "/onboarding" })} className="bg-gradient-primary text-primary-foreground">
            Ir para o onboarding
          </Button>
        </Card>
      ) : subFields.length === 0 ? (
        <Card className="space-y-3 p-8 text-center">
          <h2 className="font-display text-xl uppercase">Nenhum campo cadastrado</h2>
          <p className="text-sm text-muted-foreground">
            Adicione campos físicos no seu complexo para começar.
          </p>
          <Button onClick={addSubField} className="bg-gradient-primary text-primary-foreground">
            <Plus className="mr-1 h-4 w-4" /> Adicionar campo
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
                ownerId={session?.user?.id ?? ""}
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
  ownerId,
  bookings,
  onChanged,
}: {
  sf: SubField;
  ownerId: string;
  bookings: Booking[];
  onChanged: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"edit" | "availability" | "price" | "bookings">("edit");
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <Card className="border-border bg-card p-5">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="bg-surface">
          <TabsTrigger value="edit">
            <Building2 className="mr-1 h-4 w-4" /> Editar Campo
          </TabsTrigger>
          <TabsTrigger value="availability">
            <CalendarDays className="mr-1 h-4 w-4" /> Disponibilidade
          </TabsTrigger>
          <TabsTrigger value="price">
            <DollarSign className="mr-1 h-4 w-4" /> Preço
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

        <TabsContent value="edit" className="mt-4">
          <EditFieldTab sf={sf} ownerId={ownerId} onSaved={onChanged} />
        </TabsContent>
        <TabsContent value="availability" className="mt-4">
          <AvailabilityManager sf={sf} onSaved={onChanged} />
        </TabsContent>
        <TabsContent value="price" className="mt-4">
          <PriceManager sf={sf} onSaved={onChanged} />
        </TabsContent>
        <TabsContent value="bookings" className="mt-4">
          <BookingsList bookings={bookings} onChanged={onChanged} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function EditFieldTab({
  sf,
  ownerId,
  onSaved,
}: {
  sf: SubField;
  ownerId: string;
  onSaved: () => Promise<void>;
}) {
  const [local, setLocal] = useState<SubField>(sf);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setLocal(sf);
  }, [sf]);

  const dirty = useMemo(
    () => JSON.stringify(local) !== JSON.stringify(sf),
    [local, sf],
  );

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("sub_fields" as never)
        .update({
          name: local.name,
          field_type: local.field_type,
          photo_url: local.photo_url,
          active: local.active,
        } as never)
        .eq("id", local.id);
      if (error) throw error;
      toast.success("Campo atualizado.");
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Remover o campo "${local.name}"?`)) return;
    setRemoving(true);
    const { error } = await supabase.from("sub_fields" as never).delete().eq("id", local.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Campo removido.");
      await onSaved();
    }
    setRemoving(false);
  };

  const toggleActive = () => {
    setLocal((s) => ({ ...s, active: !s.active }));
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
        <PhotoUploader
          url={local.photo_url}
          onChange={(url) => setLocal((s) => ({ ...s, photo_url: url }))}
          ownerId={ownerId}
          folder={`field/${local.id}`}
          aspect="square"
        />

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Nome do campo</Label>
              <Input
                value={local.name}
                onChange={(e) => setLocal((s) => ({ ...s, name: e.target.value }))}
                placeholder="Campo 1"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={local.field_type}
                onValueChange={(v) => setLocal((s) => ({ ...s, field_type: v as SubFieldType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="mb-1 block">Status do Campo</Label>
              <p className="text-xs text-muted-foreground">
                {local.active ? "Visível para reservas" : "Oculto para reservas"}
              </p>
            </div>
            <Button
              onClick={toggleActive}
              className={`${
                local.active
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {local.active ? "✓ Ativo" : "✗ Inativo"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-4">
        <Button variant="outline" size="sm" onClick={remove} disabled={removing}>
          <Trash2 className="mr-1 h-4 w-4" /> Remover
        </Button>
        <Button
          size="sm"
          onClick={save}
          disabled={!dirty || saving}
          className="bg-gradient-primary text-primary-foreground"
        >
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

function AvailabilityManager({
  sf,
  onSaved,
}: {
  sf: SubField;
  onSaved: () => Promise<void>;
}) {
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
            <Button variant="ghost" size="sm" onClick={() => setTimes(HOUR_SLOTS)}>
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
          Cada slot representa uma hora de reserva. Times só conseguirão reservar dentro dos horários e dias marcados.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={!dirty || saving}
          className="bg-gradient-primary text-primary-foreground"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}

function PriceManager({
  sf,
  onSaved,
}: {
  sf: SubField;
  onSaved: () => Promise<void>;
}) {
  const [price, setPrice] = useState<number>(sf.price_per_hour);
  const [rules, setRules] = useState<PricingRule[]>(sf.pricing_rules ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrice(sf.price_per_hour);
    setRules(sf.pricing_rules ?? []);
  }, [sf]);

  const dirty = price !== sf.price_per_hour || JSON.stringify(rules) !== JSON.stringify(sf.pricing_rules ?? []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("sub_fields" as never)
      .update({ price_per_hour: Number(price) || 0, pricing_rules: rules } as never)
      .eq("id", sf.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Preço atualizado.");
      await onSaved();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
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

      <PricingRulesEditor
        rules={rules}
        basePrice={Number(price) || 0}
        onChange={setRules}
      />

      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={!dirty || saving}
          className="bg-gradient-primary text-primary-foreground"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar alterações
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
  const [updating, setUpdating] = useState<string | null>(null);

  const updateStatus = async (bookingId: string, newStatus: string) => {
    setUpdating(bookingId);
    const { error } = await supabase
      .from("bookings" as never)
      .update({ status: newStatus } as never)
      .eq("id", bookingId);
    if (error) toast.error(error.message);
    else {
      toast.success("Status atualizado.");
      await onChanged();
    }
    setUpdating(null);
  };

  if (bookings.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma reserva ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bookings.map((b) => (
        <div key={b.id} className="flex items-center justify-between rounded-md border border-border bg-surface p-3">
          <div className="flex-1">
            <div className="font-mono text-xs text-muted-foreground">
              {new Date(b.scheduled_at).toLocaleString("pt-BR")}
            </div>
            <div className="text-sm font-semibold">
              {b.status === "pending" && <span className="text-yellow-600">Pendente</span>}
              {b.status === "confirmed" && <span className="text-green-600">Confirmada</span>}
              {b.status === "cancelled" && <span className="text-red-600">Cancelada</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {b.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(b.id, "confirmed")}
                  disabled={updating === b.id}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(b.id, "cancelled")}
                  disabled={updating === b.id}
                >
                  <XCircle className="mr-1 h-4 w-4" /> Cancelar
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PhotoUploader({
  url,
  onChange,
  ownerId,
  folder,
  aspect = "video",
}: {
  url: string | null;
  onChange: (url: string) => void;
  ownerId: string;
  folder: string;
  aspect?: "video" | "square";
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!ownerId) {
      toast.error("Faça login.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${ownerId}/${folder}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("venues").upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage.from("venues").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Foto enviada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div
        className={`relative overflow-hidden rounded-lg border border-dashed border-border bg-surface ${
          aspect === "square" ? "aspect-square" : "aspect-video"
        }`}
      >
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImagePlus className="h-8 w-8" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className="mt-2 w-full"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1 h-4 w-4" />}
        {url ? "Trocar foto" : "Enviar foto"}
      </Button>
    </div>
  );
}

function PricingRulesEditor({
  rules,
  basePrice,
  onChange,
}: {
  rules: PricingRule[];
  basePrice: number;
  onChange: (rules: PricingRule[]) => void;
}) {
  const update = (idx: number, patch: Partial<PricingRule>) => {
    const next = rules.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  const remove = (idx: number) => {
    const next = rules.slice();
    next.splice(idx, 1);
    onChange(next);
  };
  const add = () => {
    onChange([
      ...rules,
      {
        id: (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `r_${Date.now()}`,
        name: "Horário nobre",
        days: ["mon", "tue", "wed", "thu", "fri"],
        start: "18:00",
        end: "23:00",
        mode: "percent",
        value: 30,
      },
    ]);
  };
  const toggleDay = (idx: number, day: string) => {
    const set = new Set(rules[idx].days);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    update(idx, { days: Array.from(set) });
  };

  return (
    <div className="rounded-md border border-border bg-card/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">
              Configuração de Horários · Preço Base R$ {basePrice.toFixed(2)}/h
            </Label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Defina regras de Horário Nobre. Quando o horário escolhido pelo cliente cair na regra, o sistema aplica acréscimo percentual sobre o preço base ou um valor fixo para a hora.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Sparkles className="mr-1 h-3.5 w-3.5" /> Nova regra
        </Button>
      </div>

      {rules.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          Sem regras: todos os horários cobram o preço base.
        </p>
      ) : (
        <div className="space-y-3">
          {rules.map((r, idx) => (
            <div key={r.id} className="rounded-md border border-border bg-surface/50 p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input
                  value={r.name}
                  onChange={(e) => update(idx, { name: e.target.value })}
                  placeholder="Nome da regra"
                />
                <Button type="button" size="sm" variant="ghost" onClick={() => remove(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {WEEKDAYS.map((d) => {
                  const on = r.days.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDay(idx, d.id)}
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-mono uppercase ${
                        on ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <div>
                  <Label className="text-[11px]">Início</Label>
                  <Input type="time" value={r.start} onChange={(e) => update(idx, { start: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px]">Fim</Label>
                  <Input type="time" value={r.end} onChange={(e) => update(idx, { end: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px]">Tipo</Label>
                  <Select value={r.mode} onValueChange={(v) => update(idx, { mode: v as "percent" | "fixed" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Acréscimo (%)</SelectItem>
                      <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px]">{r.mode === "percent" ? "% sobre base" : "R$ por hora"}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={r.value}
                    onChange={(e) => update(idx, { value: Number(e.target.value) })}
                  />
                </div>
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground">
                {r.mode === "percent"
                  ? `Resulta em R$ ${(basePrice * (1 + (Number(r.value) || 0) / 100)).toFixed(2)} por hora nesta janela.`
                  : `Cobra R$ ${(Number(r.value) || 0).toFixed(2)} por hora nesta janela.`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
