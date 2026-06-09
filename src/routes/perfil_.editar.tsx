import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Save, Trash2, Upload, ArrowLeft, Image as ImageIcon, X, Plus, Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { CityCombobox } from "@/components/CityCombobox";

export const Route = createFileRoute("/perfil_/editar")({
  head: () => ({ meta: [{ title: "Editar perfil — PeladaPro" }] }),
  component: PerfilPage,
});

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
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/perfil"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao perfil</Link>
          </Button>
          <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">Editar perfil</h1>
          <p className="text-sm text-muted-foreground">
            Personalize seu perfil para a comunidade PeladaPro.
          </p>
        </div>
        <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
          {PROFILE_TYPE_EMOJI[activeProfile.type]} {PROFILE_TYPE_LABEL[activeProfile.type]} ATIVO
        </Badge>
      </div>

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
  const [form, setForm] = useState<any>(() => ({
    name: profile.name ?? "",
    nickname: profile.nickname ?? "",
    bio: profile.bio ?? "",
    city: profile.city ?? "",
    address: profile.address ?? "",
    photo_url: profile.photo_url ?? "",
    cover_url: profile.cover_url ?? "",
    gallery_urls: profile.gallery_urls ?? [],
    position: profile.position ?? "",
    level: profile.level ?? "",
    founded: profile.founded?.toString() ?? "",
    capacity: profile.capacity?.toString() ?? "",
    field_type: profile.field_type ?? "",
    price_per_hour: profile.price_per_hour?.toString() ?? "",
    age: profile.age?.toString() ?? "",
    gender: profile.gender ?? "",
    preferred_foot: profile.preferred_foot ?? "",
    field_types: (profile.field_types ?? []) as string[],
    preferred_field: profile.preferred_field ?? "",
  }));
  
  const [uploading, setUploading] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File, target: 'photo_url' | 'cover_url' | 'gallery') => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 5MB).");
      return;
    }
    
    setUploading(target);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${profile.user_id}/${target}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      
      if (target === 'gallery') {
        const newGallery = [...(form.gallery_urls || []), url].slice(0, 10);
        setForm((f: any) => ({ ...f, gallery_urls: newGallery }));
      } else {
        setForm((f: any) => ({ ...f, [target]: url }));
      }
      
      toast.success("Upload concluído!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const removeGalleryImage = (index: number) => {
    const newGallery = form.gallery_urls.filter((_: any, i: number) => i !== index);
    setForm({ ...form, gallery_urls: newGallery });
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
      address: form.address || null,
      photo_url: form.photo_url || null,
      cover_url: form.cover_url || null,
      gallery_urls: form.gallery_urls || [],
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
    <div className="space-y-8">
      {/* BLOCO 1: IMAGENS */}
      <Card className="border-border bg-card p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
           <ImageIcon className="h-5 w-5 text-primary" />
           <h2 className="font-display text-lg uppercase tracking-wide">Imagens do Perfil</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Foto de Perfil */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Foto do Perfil</Label>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-2 border-border bg-surface">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Perfil" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl opacity-20">
                    {PROFILE_TYPE_EMOJI[profile.type]}
                  </div>
                )}
                {uploading === 'photo_url' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'photo_url')} />
                <Button size="sm" variant="outline" onClick={() => photoRef.current?.click()} disabled={!!uploading}>
                  {form.photo_url ? "Substituir" : "Inserir foto"}
                </Button>
                {form.photo_url && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setForm({...form, photo_url: ""})}>
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Foto de Capa */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Foto de Capa</Label>
            <div className="relative h-24 w-full overflow-hidden rounded-xl border-2 border-border bg-surface">
              {form.cover_url ? (
                <img src={form.cover_url} alt="Capa" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground italic">
                  Sem capa definida
                </div>
              )}
              <div className="absolute bottom-2 right-2 flex gap-1">
                <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'cover_url')} />
                <Button size="sm" variant="secondary" className="h-7 w-7 p-0 rounded-full" onClick={() => coverRef.current?.click()} disabled={!!uploading}>
                  <Upload className="h-3.5 w-3.5" />
                </Button>
                {form.cover_url && (
                  <Button size="sm" variant="destructive" className="h-7 w-7 p-0 rounded-full" onClick={() => setForm({...form, cover_url: ""})}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {uploading === 'cover_url' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Galeria */}
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Galeria (até 10 fotos)</Label>
            <span className="text-[10px] text-muted-foreground">{form.gallery_urls?.length || 0}/10</span>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {form.gallery_urls?.map((url: string, i: number) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-md border border-border bg-surface">
                <img src={url} alt={`Galeria ${i}`} className="h-full w-full object-cover" />
                <button 
                  onClick={() => removeGalleryImage(i)}
                  className="absolute inset-0 flex items-center justify-center bg-destructive/80 opacity-0 transition group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </button>
              </div>
            ))}
            {(form.gallery_urls?.length || 0) < 10 && (
              <button 
                onClick={() => galleryRef.current?.click()}
                disabled={!!uploading}
                className="flex aspect-square items-center justify-center rounded-md border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition"
              >
                {uploading === 'gallery' ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Plus className="h-5 w-5 text-muted-foreground" />}
              </button>
            )}
            <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'gallery')} />
          </div>
        </div>
      </Card>

      {/* BLOCO 2: INFORMAÇÕES */}
      <Card className="border-border bg-card p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
           <ImageIcon className="h-5 w-5 text-primary" />
           <h2 className="font-display text-lg uppercase tracking-wide">Informações Gerais</h2>
        </div>

        <div className="grid gap-4">
          {/* Linha 1 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome {type === 'team' ? 'do Time' : type === 'field' ? 'do Estabelecimento' : 'Completo'} <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Arena Central" />
            </div>
            <div className="space-y-2">
              <Label>Apelido / TAG (Opcional)</Label>
              <Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="Ex: arena-central" />
            </div>
          </div>

          {/* Linha 2 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <CityCombobox value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro..." />
            </div>
          </div>

          {/* Linha 3 */}
          <div className="space-y-2">
            <Label>Bio / Descrição</Label>
            <Textarea
              rows={4}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Conte um pouco sobre você, seu time ou seu complexo."
              className="resize-none"
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" className="text-destructive" onClick={onDelete}>
          Excluir este perfil
        </Button>
        <Button onClick={submit} className="bg-gradient-primary text-primary-foreground px-8 py-6 text-lg">
          <Save className="mr-2 h-5 w-5" /> Salvar alterações
        </Button>
      </div>
    </div>
  );
}
