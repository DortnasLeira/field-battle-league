import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Save, Plus, Trash2, User, Shield, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [{ title: "Perfis — PeladaPro" }],
  }),
  component: PerfilPage,
});

const TYPE_ICON: Record<ProfileType, typeof User> = { player: User, team: Shield, field: MapPin };

function PerfilPage() {
  const { session, profiles, activeProfile, loading, upsertProfile, deleteProfile, setActive } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
    else if (!loading && session && profiles.length === 0) navigate({ to: "/onboarding" });
  }, [loading, session, profiles, navigate]);

  const initialTab = activeProfile?.type ?? profiles[0]?.type ?? "player";
  const [tab, setTab] = useState<ProfileType>(initialTab as ProfileType);
  useEffect(() => {
    if (activeProfile) setTab(activeProfile.type);
  }, [activeProfile]);

  if (!session || profiles.length === 0) return null;

  const types: ProfileType[] = ["player", "team", "field"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">Meus perfis</h1>
        <p className="text-sm text-muted-foreground">Personalize cada um e troque o ativo a qualquer momento.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ProfileType)}>
        <TabsList className="w-full justify-start sm:w-auto">
          {types.map((t) => {
            const exists = profiles.find((p) => p.type === t);
            const Icon = TYPE_ICON[t];
            return (
              <TabsTrigger key={t} value={t} className="font-display uppercase tracking-wide">
                <Icon className="mr-2 h-4 w-4" />
                {PROFILE_TYPE_LABEL[t]}
                {!exists && <Plus className="ml-1 h-3 w-3 opacity-50" />}
                {exists?.id === activeProfile?.id && (
                  <Badge className="ml-2 h-4 bg-primary/20 px-1.5 text-[9px] text-primary hover:bg-primary/20">ATIVO</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {types.map((t) => (
          <TabsContent key={t} value={t} className="mt-6">
            <ProfileEditor
              type={t}
              profile={profiles.find((p) => p.type === t)}
              isActive={activeProfile?.type === t}
              onSave={async (data) => {
                await upsertProfile({ ...data, type: t });
                toast.success("Perfil salvo!");
              }}
              onDelete={async (id) => {
                await deleteProfile(id);
                toast.success("Perfil removido.");
              }}
              onSetActive={async (id) => {
                await setActive(id);
                toast.success("Perfil ativado.");
              }}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ProfileEditor({
  type,
  profile,
  isActive,
  onSave,
  onDelete,
  onSetActive,
}: {
  type: ProfileType;
  profile?: UserProfile;
  isActive: boolean;
  onSave: (data: Partial<UserProfile> & { name: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetActive: (id: string) => Promise<void>;
}) {
  const isNew = !profile;
  const initialState = (p?: UserProfile) => ({
    name: p?.name ?? "",
    nickname: p?.nickname ?? "",
    bio: p?.bio ?? "",
    city: p?.city ?? "",
    avatar: p?.avatar ?? PRESET_AVATARS_BY_TYPE[type][0],
    color: p?.color ?? PRESET_COLORS[0],
    frame: p?.frame ?? "classic",
    position: p?.position ?? "",
    level: p?.level ?? "",
    founded: p?.founded?.toString() ?? "",
    capacity: p?.capacity?.toString() ?? "",
    field_type: p?.field_type ?? "",
    price_per_hour: p?.price_per_hour?.toString() ?? "",
    address: p?.address ?? "",
    age: (p as UserProfile & { age?: number | null })?.age?.toString() ?? "",
    gender: (p as UserProfile & { gender?: string | null })?.gender ?? "",
    preferred_foot: (p as UserProfile & { preferred_foot?: string | null })?.preferred_foot ?? "",
    field_types: ((p as UserProfile & { field_types?: string[] | null })?.field_types ?? []) as string[],
    photo_url: (p as UserProfile & { photo_url?: string | null })?.photo_url ?? "",
  });
  const [form, setForm] = useState(() => initialState(profile));

  // reset when profile changes
  useEffect(() => {
    setForm(initialState(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, type]);

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
    } as Partial<UserProfile> & { name: string });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Preview */}
      <Card className="border-border bg-card p-5 text-center">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Pré-visualização</div>
        <div className="mt-4 flex flex-col items-center gap-3">
          <div
            className={cn("flex h-24 w-24 items-center justify-center rounded-2xl text-5xl", frameClass(form.frame))}
            style={{ background: form.color + "22", color: form.color }}
          >
            {form.avatar}
          </div>
          <div>
            <div className="font-display text-xl uppercase tracking-wide">{form.name || "Sem nome"}</div>
            {form.nickname && <div className="text-sm text-muted-foreground">"{form.nickname}"</div>}
            <Badge className="mt-2 bg-primary/15 text-primary hover:bg-primary/20">
              {PROFILE_TYPE_EMOJI[type]} {PROFILE_TYPE_LABEL[type]}
            </Badge>
            {form.city && <div className="mt-2 text-xs text-muted-foreground">{form.city}</div>}
          </div>
        </div>
        {!isNew && (
          <div className="mt-4 space-y-2">
            {!isActive && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => onSetActive(profile!.id)}>
                Ativar este perfil
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                if (confirm("Remover este perfil?")) onDelete(profile!.id);
              }}
            >
              <Trash2 className="mr-2 h-3 w-3" /> Excluir perfil
            </Button>
          </div>
        )}
      </Card>

      {/* Form */}
      <Card className="border-border bg-card p-5 space-y-5">
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

          {/* Type-specific */}
          {type === "player" && (
            <>
              <div>
                <Label>Posição</Label>
                <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Ex: Atacante" />
              </div>
              <div>
                <Label>Nível</Label>
                <Input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="Iniciante / Intermediário / Avançado" />
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
            <Label className="mb-2 block">Avatar</Label>
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
              {FRAMES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setForm({ ...form, frame: f.id })}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition",
                    form.frame === f.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card",
                  )}
                >
                  <span
                    className={cn("inline-block h-5 w-5 rounded-full", f.ring)}
                    style={{ background: form.color + "44" }}
                  />
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} className="bg-gradient-primary text-primary-foreground">
            <Save className="mr-2 h-4 w-4" /> {isNew ? "Criar perfil" : "Salvar alterações"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
