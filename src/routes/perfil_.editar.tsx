import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Save, Trash2, Upload, ArrowLeft, ImagePlus, X } from "lucide-react";
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
  type ProfileType,
  type UserProfile,
} from "@/lib/auth";
import { useProtectedAccess } from "@/lib/useProtectedAccess";
import { RouteLoadingSkeleton } from "@/components/RouteLoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CityCombobox } from "@/components/CityCombobox";

export const Route = createFileRoute("/perfil_/editar")({
  head: () => ({ meta: [{ title: "Editar perfil — PeladaPro" }] }),
  component: PerfilPage,
});

const MAX_GALLERY = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_EXT_LABEL = "JPG, PNG, WEBP ou GIF";

function validateImage(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `Formato não suportado: use ${ACCEPTED_EXT_LABEL}.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `Arquivo muito grande (${mb}MB). Máximo 5MB.`;
  }
  if (file.size === 0) {
    return "Arquivo vazio ou inválido.";
  }
  return null;
}

function PerfilPage() {
  const access = useProtectedAccess("auth", { redirectBack: "/perfil/editar" });
  const { profiles, activeProfile, updateProfile, deleteProfile, setActive } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (access.status === "ready" && profiles.length === 0) {
      navigate({ to: "/onboarding" });
    }
  }, [access.status, profiles.length, navigate]);

  if (access.status === "loading") return <RouteLoadingSkeleton label="Carregando edição de perfil" />;
  if (!activeProfile) return <RouteLoadingSkeleton label="Carregando perfil ativo" />;

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
    address: p.address ?? "",
    photo_url: p.photo_url ?? "",
    cover_url: p.cover_url ?? "",
    gallery: (p.gallery ?? []) as string[],
    position: p.position ?? "",
    level: p.level ?? "",
    founded: p.founded?.toString() ?? "",
    capacity: p.capacity?.toString() ?? "",
    field_type: p.field_type ?? "",
    price_per_hour: p.price_per_hour?.toString() ?? "",
    age: p.age?.toString() ?? "",
    gender: p.gender ?? "",
    preferred_foot: p.preferred_foot ?? "",
    field_types: (p.field_types ?? []) as string[],
    preferred_field: p.preferred_field ?? "",
  });
  const [form, setForm] = useState(() => initial(profile));
  const [uploading, setUploading] = useState<null | "photo" | "cover" | "gallery">(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(initial(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  const uploadFile = async (file: File, prefix: string): Promise<string> => {
    const err = validateImage(file);
    if (err) throw new Error(err);
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${profile.user_id}/${profile.id}-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (upErr) throw new Error(upErr.message || "Falha ao enviar imagem.");
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  };

  const handlePhoto = async (file: File) => {
    setUploading("photo");
    try {
      const url = await uploadFile(file, "photo");
      setForm((f) => ({ ...f, photo_url: url }));
      await onSave({ photo_url: url });
      toast.success("Foto de perfil atualizada.");
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(null); }
  };

  const handleCover = async (file: File) => {
    setUploading("cover");
    try {
      const url = await uploadFile(file, "cover");
      setForm((f) => ({ ...f, cover_url: url }));
      await onSave({ cover_url: url });
      toast.success("Foto de capa atualizada.");
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(null); }
  };

  const handleGallery = async (files: FileList) => {
    const slots = MAX_GALLERY - form.gallery.length;
    if (slots <= 0) { toast.error(`Galeria cheia (máx ${MAX_GALLERY} fotos).`); return; }
    const all = Array.from(files);
    if (all.length > slots) {
      toast.warning(`Apenas ${slots} foto(s) serão enviadas (limite de ${MAX_GALLERY}).`);
    }
    const list = all.slice(0, slots);

    // Pré-valida antes de iniciar uploads
    for (const f of list) {
      const err = validateImage(f);
      if (err) { toast.error(`${f.name}: ${err}`); return; }
    }

    setUploading("gallery");
    const urls: string[] = [];
    let failed = 0;
    try {
      for (const f of list) {
        try { urls.push(await uploadFile(f, "gallery")); }
        catch (e) { failed++; toast.error(`${f.name}: ${(e as Error).message}`); }
      }
      if (urls.length) {
        const next = [...form.gallery, ...urls];
        setForm((f) => ({ ...f, gallery: next }));
        await onSave({ gallery: next });
        toast.success(`${urls.length} foto(s) adicionada(s)${failed ? `, ${failed} falhou(aram)` : ""}.`);
      }
    } finally { setUploading(null); }
  };

  const removeGalleryAt = async (idx: number) => {
    const next = form.gallery.filter((_, i) => i !== idx);
    setForm((f) => ({ ...f, gallery: next }));
    await onSave({ gallery: next });
  };

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório."); return; }
    await onSave({
      name: form.name.trim(),
      nickname: form.nickname.trim() || null,
      bio: form.bio.trim() || null,
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      position: type === "player" ? form.position || null : null,
      level: type === "player" || type === "team" ? form.level || null : null,
      founded: type === "team" && form.founded ? Number(form.founded) : null,
      capacity: type === "field" && form.capacity ? Number(form.capacity) : null,
      field_type: type === "field" ? form.field_type || null : null,
      price_per_hour: type === "field" && form.price_per_hour ? Number(form.price_per_hour) : null,
      age: type === "player" && form.age ? Number(form.age) : null,
      gender: type === "player" ? form.gender || null : null,
      preferred_foot: type === "player" ? form.preferred_foot || null : null,
      field_types: type === "player" ? (form.field_types.length ? form.field_types : null) : null,
      preferred_field: type === "team" ? (form.preferred_field || null) : null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Bloco 1: Imagens */}
      <Card className="border-border bg-card p-5 space-y-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Imagens do perfil
        </div>

        {/* Capa + Foto sobreposta */}
        <div className="relative">
          <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border bg-surface/60 sm:h-56">
            {form.cover_url ? (
              <img src={form.cover_url} alt="Capa" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                Sem foto de capa
              </div>
            )}
            <div className="absolute right-3 top-3 flex gap-2">
              <input
                ref={coverRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCover(f); e.target.value = ""; }}
              />
              <Button size="sm" variant="secondary" onClick={() => coverRef.current?.click()} disabled={uploading === "cover"}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {uploading === "cover" ? "Enviando..." : form.cover_url ? "Substituir capa" : "Adicionar capa"}
              </Button>
              {form.cover_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setForm((f) => ({ ...f, cover_url: "" }));
                    await onSave({ cover_url: null });
                    toast.success("Capa removida.");
                  }}
                >
                  Remover
                </Button>
              )}
            </div>
          </div>

          {/* Foto perfil */}
          <div className="-mt-12 flex items-end gap-4 pl-4 sm:-mt-14">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-card bg-surface sm:h-28 sm:w-28">
              {form.photo_url ? (
                <img src={form.photo_url} alt="Foto" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl">
                  {PROFILE_TYPE_EMOJI[type]}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pb-2">
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = ""; }}
              />
              <Button size="sm" onClick={() => photoRef.current?.click()} disabled={uploading === "photo"}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {uploading === "photo" ? "Enviando..." : form.photo_url ? "Substituir foto" : "Adicionar foto"}
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
          </div>
        </div>

        {/* Galeria */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Galeria ({form.gallery.length}/{MAX_GALLERY})
            </Label>
            <input
              ref={galleryRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={(e) => { const fs = e.target.files; if (fs && fs.length) handleGallery(fs); e.target.value = ""; }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => galleryRef.current?.click()}
              disabled={uploading === "gallery" || form.gallery.length >= MAX_GALLERY}
            >
              <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
              {uploading === "gallery" ? "Enviando..." : "Adicionar fotos"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {ACCEPTED_EXT_LABEL} • máx 5MB por foto • até {MAX_GALLERY} no total
          </p>
          {form.gallery.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Nenhuma foto adicionada ainda. Envie até {MAX_GALLERY} fotos do complexo.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {form.gallery.map((url, i) => (
                <div key={url + i} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-surface">
                  <img src={url} alt={`Galeria ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryAt(i)}
                    className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 transition group-hover:opacity-100"
                    aria-label="Remover foto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Bloco 2: Dados */}
      <Card className="border-border bg-card p-5 space-y-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Informações
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nome do estabelecimento *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Apelido / TAG</Label>
            <Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="Opcional" />
          </div>

          <div>
            <Label>Cidade</Label>
            <CityCombobox value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro" />
          </div>

          <div className="sm:col-span-2">
            <Label>Bio / Descrição</Label>
            <Textarea
              rows={4}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Conte sobre o estabelecimento."
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
              <div className="sm:col-span-2">
                <Label>Campo preferido</Label>
                <Input value={form.preferred_field} onChange={(e) => setForm({ ...form, preferred_field: e.target.value })} placeholder="Ex: Arena Central (deixe vazio se for visitante)" />
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
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-3 w-3" /> Excluir este perfil
          </Button>
          <Button onClick={submit} className="bg-gradient-primary text-primary-foreground">
            <Save className="mr-2 h-4 w-4" /> Salvar alterações
          </Button>
        </div>
      </Card>
    </div>
  );
}
