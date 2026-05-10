import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, Plus, Trash2, Save, ImagePlus, Loader2, MapPin, Phone, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/complexo")({
  head: () => ({
    meta: [
      { title: "Meu Complexo — PeladaPro" },
      { name: "description", content: "Cadastre seu complexo esportivo e adicione seus campos com tipo, preço, horários e fotos." },
    ],
  }),
  component: ComplexoPage,
});

type SubFieldType = "society" | "areia" | "sintetico" | "salao";

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
  photo_url: string | null;
  active: boolean;
};

function ComplexoPage() {
  const { session, accountType, loading } = useAuth();
  const navigate = useNavigate();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [subFields, setSubFields] = useState<SubField[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [savingVenue, setSavingVenue] = useState(false);

  // Local form state for venue (so editing doesn't fight the source of truth)
  const [vForm, setVForm] = useState({ name: "", city: "", address: "", phone: "", bio: "", photo_url: "" });

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/auth", search: { redirect: "/complexo" } });
      return;
    }
    if (accountType !== "business") {
      toast.error("Apenas contas Business podem gerenciar um complexo.");
      navigate({ to: "/" });
    }
  }, [session, accountType, loading, navigate]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoadingData(true);
    const { data: venues } = await supabase
      .from("venues" as never)
      .select("*")
      .eq("owner_user_id", session.user.id)
      .order("created_at")
      .limit(1);
    const v = (venues as Venue[] | null)?.[0] ?? null;
    setVenue(v);
    if (v) {
      setVForm({
        name: v.name ?? "",
        city: v.city ?? "",
        address: v.address ?? "",
        phone: v.phone ?? "",
        bio: v.bio ?? "",
        photo_url: v.photo_url ?? "",
      });
      const { data: sfs } = await supabase
        .from("sub_fields" as never)
        .select("*")
        .eq("venue_id", v.id)
        .order("created_at");
      setSubFields((sfs as SubField[] | null) ?? []);
    } else {
      setSubFields([]);
    }
    setLoadingData(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const saveVenue = async () => {
    if (!session?.user) return;
    if (!vForm.name.trim()) { toast.error("Informe o nome do complexo."); return; }
    setSavingVenue(true);
    try {
      if (venue) {
        const { error } = await supabase
          .from("venues" as never)
          .update(vForm as never)
          .eq("id", venue.id);
        if (error) throw error;
        toast.success("Complexo atualizado.");
      } else {
        const { error } = await supabase
          .from("venues" as never)
          .insert({ ...vForm, owner_user_id: session.user.id } as never);
        if (error) throw error;
        toast.success("Complexo cadastrado!");
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSavingVenue(false);
    }
  };

  const addSubField = async () => {
    if (!venue) { toast.error("Salve o complexo primeiro."); return; }
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
    if (error) { toast.error(error.message); return; }
    await load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6">
      <div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-wider">Perfil Business</span>
        </div>
        <h1 className="mt-1 font-display text-3xl uppercase tracking-wider sm:text-4xl">
          Meu <span className="text-gradient-primary">Complexo</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre o estabelecimento e adicione múltiplos campos físicos, cada um com seu próprio tipo, preço, horários e foto.
        </p>
      </div>

      {loadingData ? (
        <Card className="flex items-center justify-center p-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
        </Card>
      ) : (
        <>
          <VenueForm
            v={vForm}
            setV={setVForm}
            onSave={saveVenue}
            saving={savingVenue}
            existing={!!venue}
            ownerId={session?.user?.id ?? ""}
          />

          {venue && (
            <Card className="border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Campos do complexo</div>
                  <h2 className="font-display text-xl uppercase tracking-wide">
                    {subFields.length} campo{subFields.length === 1 ? "" : "s"}
                  </h2>
                </div>
                <Button onClick={addSubField} className="bg-gradient-primary text-primary-foreground">
                  <Plus className="mr-1 h-4 w-4" /> Adicionar campo
                </Button>
              </div>
              {subFields.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nenhum campo adicionado ainda. Clique em <strong className="text-foreground">Adicionar campo</strong> para começar.
                </p>
              ) : (
                <div className="space-y-4">
                  {subFields.map((sf) => (
                    <SubFieldEditor
                      key={sf.id}
                      sf={sf}
                      ownerId={session?.user?.id ?? ""}
                      onChange={load}
                    />
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function VenueForm({
  v, setV, onSave, saving, existing, ownerId,
}: {
  v: { name: string; city: string; address: string; phone: string; bio: string; photo_url: string };
  setV: React.Dispatch<React.SetStateAction<{ name: string; city: string; address: string; phone: string; bio: string; photo_url: string }>>;
  onSave: () => void;
  saving: boolean;
  existing: boolean;
  ownerId: string;
}) {
  return (
    <Card className="border-border bg-card p-5">
      <div className="mb-4">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Estabelecimento</div>
        <h2 className="font-display text-xl uppercase tracking-wide">Dados do complexo</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome do complexo *</Label>
            <Input value={v.name} onChange={(e) => setV((s) => ({ ...s, name: e.target.value }))} placeholder="Ex: Arena Match" />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={v.city} onChange={(e) => setV((s) => ({ ...s, city: e.target.value }))} placeholder="São Paulo" />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={v.phone} onChange={(e) => setV((s) => ({ ...s, phone: e.target.value }))} placeholder="(11) 99999-0000" />
          </div>
          <div className="sm:col-span-2">
            <Label>Endereço</Label>
            <Input value={v.address} onChange={(e) => setV((s) => ({ ...s, address: e.target.value }))} placeholder="Rua, número, bairro" />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea value={v.bio} onChange={(e) => setV((s) => ({ ...s, bio: e.target.value }))} placeholder="Conte sobre a estrutura do complexo." rows={3} />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Foto de capa</Label>
          <PhotoUploader
            url={v.photo_url}
            onChange={(url) => setV((s) => ({ ...s, photo_url: url }))}
            ownerId={ownerId}
            folder="cover"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={onSave} disabled={saving} className="bg-gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {existing ? "Salvar alterações" : "Cadastrar complexo"}
        </Button>
      </div>
    </Card>
  );
}

function SubFieldEditor({ sf, ownerId, onChange }: { sf: SubField; ownerId: string; onChange: () => Promise<void> }) {
  const [local, setLocal] = useState<SubField>(sf);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => { setLocal(sf); }, [sf]);

  const dirty = useMemo(
    () => JSON.stringify(local) !== JSON.stringify(sf),
    [local, sf],
  );

  const toggleArray = (key: "available_days" | "available_times", val: string) => {
    setLocal((s) => {
      const set = new Set(s[key]);
      if (set.has(val)) set.delete(val); else set.add(val);
      return { ...s, [key]: Array.from(set) };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("sub_fields" as never)
        .update({
          name: local.name,
          field_type: local.field_type,
          price_per_hour: Number(local.price_per_hour) || 0,
          available_days: local.available_days,
          available_times: local.available_times,
          photo_url: local.photo_url,
          active: local.active,
        } as never)
        .eq("id", local.id);
      if (error) throw error;
      toast.success("Campo salvo.");
      await onChange();
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
    if (error) toast.error(error.message); else { toast.success("Campo removido."); await onChange(); }
    setRemoving(false);
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <PhotoUploader
          url={local.photo_url}
          onChange={(url) => setLocal((s) => ({ ...s, photo_url: url }))}
          ownerId={ownerId}
          folder={`field/${local.id}`}
          aspect="square"
        />

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label>Nome do campo</Label>
              <Input value={local.name} onChange={(e) => setLocal((s) => ({ ...s, name: e.target.value }))} placeholder="Campo 1" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={local.field_type} onValueChange={(v) => setLocal((s) => ({ ...s, field_type: v as SubFieldType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preço por hora (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number" min={0} step="0.01"
                  className="pl-9"
                  value={local.price_per_hour}
                  onChange={(e) => setLocal((s) => ({ ...s, price_per_hour: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-1 block">Dias disponíveis</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d) => {
                const on = local.available_days.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleArray("available_days", d.id)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition ${
                      on ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="mb-1 block">Horários disponíveis</Label>
            <div className="flex flex-wrap gap-1.5">
              {TIME_SLOTS.map((t) => {
                const on = local.available_times.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleArray("available_times", t)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-mono transition ${
                      on ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={local.active}
                onChange={(e) => setLocal((s) => ({ ...s, active: e.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
              Campo ativo (visível para reservas)
            </label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={remove} disabled={removing}>
                <Trash2 className="mr-1 h-4 w-4" /> Remover
              </Button>
              <Button size="sm" onClick={save} disabled={!dirty || saving} className="bg-gradient-primary text-primary-foreground">
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotoUploader({
  url, onChange, ownerId, folder, aspect = "video",
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
    if (!ownerId) { toast.error("Faça login."); return; }
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
        className={`relative overflow-hidden rounded-lg border border-dashed border-border bg-surface ${aspect === "square" ? "aspect-square" : "aspect-video"}`}
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
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
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
