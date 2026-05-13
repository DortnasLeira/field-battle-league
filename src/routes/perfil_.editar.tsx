import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Save, Trash2, Upload, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useAuth,
  PROFILE_TYPE_LABEL,
  PROFILE_TYPE_EMOJI,
  PRESET_AVATARS_BY_TYPE,
  PRESET_COLORS,
  FRAMES,
  frameClass,
  type ProfileType,
  type UserProfile,
} from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FRAME_UNLOCK, isFrameUnlocked } from "@/lib/achievements";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/perfil_/editar")({
  head: () => ({ meta: [{ title: "Editar perfil — PeladaPro" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const { session, profiles, activeProfile, loading, updateProfile, deleteProfile, setActive } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", search: { redirect: "/perfil/editar" } });
    else if (!loading && session && profiles.length === 0) navigate({ to: "/onboarding" });
  }, [loading, session, profiles, navigate]);

  if (!session || !activeProfile) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/perfil"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao perfil</Link>
          </Button>
          <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">Editar perfil</h1>
          <p className="text-sm text-muted-foreground">
            Você está editando o perfil ativo. Para editar outro, troque pelo menu no topo.
          </p>
        </div>
        <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
          {PROFILE_TYPE_EMOJI[activeProfile.type]} {PROFILE_TYPE_LABEL[activeProfile.type]} ATIVO
        </Badge>
      </div>

      {profiles.length > 1 && (
        <Card className="border-border bg-surface/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Outros perfis:
            </span>
            {profiles
              .filter((p) => p.id !== activeProfile.id)
              .map((p) => (
                <Button
                  key={p.id}
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await setActive(p.id);
                    toast.success(`Perfil ${PROFILE_TYPE_LABEL[p.type]} ativado.`);
                  }}
                >
                  <span className="mr-1.5">{p.avatar ?? PROFILE_TYPE_EMOJI[p.type]}</span>
                  {p.nickname || p.name}
                </Button>
              ))}
          </div>
        </Card>
      )}

      <ProfileEditor
        profile={activeProfile}
        onSave={async (patch) => {
          await updateProfile(activeProfile.id, patch);
          toast.success("Perfil atualizado!");
        }}
        onDelete={async () => {
          if (!confirm("Remover este perfil? Esta ação não pode ser desfeita.")) return;
          await deleteProfile(activeProfile.id);
          toast.success("Perfil removido.");
          navigate({ to: "/perfil" });
        }}
      />
    </div>
  );
}

function ProfileEditor({
  profile,
  onSave,
  onDelete,
}: {
  profile: UserProfile;
  onSave: (patch: Partial<UserProfile>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const type: ProfileType = profile.type;
  const initial = (p: UserProfile) => ({
    name: p.name ?? "",
    nickname: p.nickname ?? "",
    bio: p.bio ?? "",
    city: p.city ?? "",
    avatar: p.avatar ?? PRESET_AVATARS_BY_TYPE[type][0],
    color: p.color ?? PRESET_COLORS[0],
    frame: p.frame ?? "classic",
    position: p.position ?? "",
    level: p.level ?? "",
    founded: p.founded?.toString() ?? "",
    capacity: p.capacity?.toString() ?? "",
    field_type: p.field_type ?? "",
    price_per_hour: p.price_per_hour?.toString() ?? "",
    address: p.address ?? "",
    age: p.age?.toString() ?? "",
    gender: p.gender ?? "",
    preferred_foot: p.preferred_foot ?? "",
    field_types: (p.field_types ?? []) as string[],
    photo_url: p.photo_url ?? "",
    preferred_field: p.preferred_field ?? "",
  });
  const [form, setForm] = useState(() => initial(profile));
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(initial(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 5MB).");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${profile.user_id}/${profile.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      setForm((f) => ({ ...f, photo_url: url }));
      // Persist immediately so the perfil home reflects the new photo
      await onSave({ photo_url: url });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!form.name) {
      toast.error("Informe o nome.");
      return;
    }
    await onSave({
      name: form.name,
      nickname: form.nickname || null,
      bio: form.bio || null,
      city: form.city || null,
      avatar: form.avatar,
      color: form.color,
      frame: form.frame,
      position: type === "player" ? form.position || null : null,
      level: type === "player" || type === "team" ? form.level || null : null,
      founded: type === "team" && form.founded ? Number(form.founded) : null,
      capacity: type === "field" && form.capacity ? Number(form.capacity) : null,
      field_type: type === "field" ? form.field_type || null : null,
      price_per_hour: type === "field" && form.price_per_hour ? Number(form.price_per_hour) : null,
      address: type === "field" ? form.address || null : null,
      age: type === "player" && form.age ? Number(form.age) : null,
      gender: type === "player" ? form.gender || null : null,
      preferred_foot: type === "player" ? form.preferred_foot || null : null,
      field_types: type === "player" ? (form.field_types.length ? form.field_types : null) : null,
      photo_url: form.photo_url || null,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Preview */}
      <Card className="border-border bg-card p-5 text-center">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Pré-visualização</div>
        <div className="mt-4 flex flex-col items-center gap-3">
          <div
            className={cn(
              "flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl text-5xl",
              frameClass(form.frame),
            )}
            style={{ background: form.color + "22", color: form.color }}
          >
            {form.photo_url ? (
              <img src={form.photo_url} alt={form.name} className="h-full w-full object-cover" />
            ) : (
              form.avatar
            )}
          </div>
          <div>
            <div className="font-display text-xl uppercase tracking-wide">{form.name || "Sem nome"}</div>
            {form.nickname && <div className="text-sm text-muted-foreground">"{form.nickname}"</div>}
            {form.city && <div className="mt-2 text-xs text-muted-foreground">{form.city}</div>}
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-3 w-3" /> Excluir este perfil
          </Button>
        </div>
      </Card>

      {/* Form */}
      <Card className="border-border bg-card p-5 space-y-5">
        {/* Photo upload (player) */}
        {type === "player" && (
          <div className="rounded-lg border border-border bg-surface/60 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Foto do perfil</div>
            <div className="mt-3 flex items-center gap-4">
              <div
                className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border"
                style={{ background: form.color + "22" }}
              >
                {form.photo_url ? (
                  <img src={form.photo_url} alt="foto" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl">{form.avatar}</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Enviando..." : form.photo_url ? "Substituir foto" : "Enviar foto"}
                  </Button>
                  {form.photo_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setForm((f) => ({ ...f, photo_url: "" }));
                        await onSave({ photo_url: null });
                        toast.success("Foto removida.");
                      }}
                    >
                      Remover
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">JPG/PNG até 5MB. Atualiza imediatamente seu perfil.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nome {type === "team" ? "do time" : type === "field" ? "do campo" : "completo"}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Apelido / Tag</Label>
            <Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="Opcional" />
          </div>
          <div className="sm:col-span-2">
            <Label>Cidade</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Cidade" />
          </div>
          <div className="sm:col-span-2">
            <Label>Bio</Label>
            <Textarea
              rows={2}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Conte algo sobre você/seu time/seu campo."
            />
          </div>

          {type === "player" && (
            <>
              <div>
                <Label>Idade</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={form.age}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") return setForm({ ...form, age: "" });
                    const n = Math.max(1, Math.min(99, Number(v)));
                    setForm({ ...form, age: String(n) });
                  }}
                  placeholder="1 a 99"
                />
              </div>
              <div>
                <Label>Pé preferido</Label>
                <Select value={form.preferred_foot} onValueChange={(v) => setForm({ ...form, preferred_foot: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Destro">Destro</SelectItem>
                    <SelectItem value="Canhoto">Canhoto</SelectItem>
                    <SelectItem value="Ambidestro">Ambidestro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Tipos de campo</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {["Society", "Areia", "Sintético", "Campo"].map((ft) => {
                    const on = form.field_types.includes(ft);
                    return (
                      <button
                        key={ft}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            field_types: on ? form.field_types.filter((x) => x !== ft) : [...form.field_types, ft],
                          })
                        }
                        className={cn(
                          "rounded-md border px-3 py-1 text-xs transition",
                          on ? "border-primary bg-primary/10 text-primary" : "border-border bg-card",
                        )}
                      >
                        {ft}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          {type === "team" && (
            <>
              <div>
                <Label>Nível do time</Label>
                <Input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="Amador / Semi-pro" />
              </div>
              <div>
                <Label>Fundado em</Label>
                <Input type="number" value={form.founded} onChange={(e) => setForm({ ...form, founded: e.target.value })} placeholder="Ex: 2018" />
              </div>
            </>
          )}
          {type === "field" && (
            <>
              <div>
                <Label>Tipo</Label>
                <Input value={form.field_type} onChange={(e) => setForm({ ...form, field_type: e.target.value })} placeholder="Society / Futsal / Campo" />
              </div>
              <div>
                <Label>Capacidade</Label>
                <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="Jogadores" />
              </div>
              <div>
                <Label>Preço/hora (R$)</Label>
                <Input type="number" value={form.price_per_hour} onChange={(e) => setForm({ ...form, price_per_hour: e.target.value })} placeholder="280" />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua..." />
              </div>
            </>
          )}
        </div>

        {/* Customização visual */}
        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Customização visual</div>
          <div>
            <Label className="mb-2 block">Avatar (usado quando não há foto)</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_AVATARS_BY_TYPE[type].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setForm({ ...form, avatar: a })}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md border text-lg transition",
                    form.avatar === a ? "border-primary bg-primary/10" : "border-border bg-card",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Cor do perfil</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={cn(
                    "h-8 w-8 rounded-md transition",
                    form.color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : "",
                  )}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Moldura</Label>
            <div className="flex flex-wrap gap-2">
              {FRAMES.map((f) => {
                const unlocked = type === "player" ? isFrameUnlocked(f.id) : true;
                const reqLabel = FRAME_UNLOCK[f.id]?.label;
                return (
                  <button
                    key={f.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => setForm({ ...form, frame: f.id })}
                    title={unlocked ? f.label : reqLabel}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition",
                      form.frame === f.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card",
                      !unlocked && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span className={cn("inline-block h-5 w-5 rounded-full", f.ring)} style={{ background: form.color + "44" }} />
                    {f.label}
                    {!unlocked && <Lock className="ml-1 h-3 w-3" />}
                  </button>
                );
              })}
            </div>
            {type === "player" && (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Molduras são desbloqueadas conforme suas conquistas.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} className="bg-gradient-primary text-primary-foreground">
            <Save className="mr-2 h-4 w-4" /> Salvar alterações
          </Button>
        </div>
      </Card>
    </div>
  );
}
