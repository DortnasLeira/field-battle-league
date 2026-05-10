import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronRight, User, Shield, MapPin, Briefcase, Trophy, Phone, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useAuth,
  PROFILE_TYPE_LABEL,
  PRESET_AVATARS_BY_TYPE,
  PRESET_COLORS,
  ALLOWED_PROFILE_TYPES,
  ACCOUNT_TYPE_LABEL,
  type ProfileType,
  type AccountType,
} from "@/lib/auth";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [{ title: "Configurar perfis — PeladaPro" }],
  }),
  component: OnboardingPage,
});

const TYPES: { id: ProfileType; icon: typeof User; desc: string }[] = [
  { id: "player", icon: User, desc: "Quero jogar pelada, entrar em times e me candidatar a vagas." },
  { id: "team", icon: Shield, desc: "Sou capitão de um time e quero gerenciar elenco e desafios." },
  { id: "field", icon: MapPin, desc: "Sou dono ou gestor de um campo e quero anunciar horários." },
];

const ACCOUNT_OPTIONS: { id: AccountType; icon: typeof User; title: string; desc: string; allowed: string }[] = [
  {
    id: "sportist",
    icon: Trophy,
    title: "Perfil Esportista",
    desc: "Para quem joga ou capitaneia um time. Permite criar perfis de Jogador e Time.",
    allowed: "Jogador + Time",
  },
  {
    id: "business",
    icon: Briefcase,
    title: "Perfil Business",
    desc: "Para proprietários e gestores de complexos esportivos. Permite criar perfil de Campo.",
    allowed: "Campo",
  },
];

function OnboardingPage() {
  const { session, profiles, loading, upsertProfile, accountType, setAccountType } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ProfileType[]>([]);
  const [step, setStep] = useState<"kind" | "choose" | "fill">(accountType ? "choose" : "kind");
  const [savingKind, setSavingKind] = useState<AccountType | null>(null);
  const [forms, setForms] = useState<Record<ProfileType, { name: string; nickname: string; city: string; avatar: string; color: string }>>({
    player: { name: "", nickname: "", city: "", avatar: "⚽", color: "#F59E0B" },
    team: { name: "", nickname: "", city: "", avatar: "🦁", color: "#EF4444" },
    field: { name: "", nickname: "", city: "", avatar: "🏟️", color: "#10B981" },
  });
  const [venueForm, setVenueForm] = useState({ address: "", phone: "", bio: "" });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (accountType && step === "kind") setStep("choose");
  }, [accountType, step]);

  const allowedTypes = accountType ? ALLOWED_PROFILE_TYPES[accountType] : [];
  const visibleTypes = TYPES.filter((t) => allowedTypes.includes(t.id));
  const existingTypes = new Set(profiles.map((p) => p.type));

  const chooseKind = async (t: AccountType) => {
    setSavingKind(t);
    try {
      await setAccountType(t);
      setStep("choose");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao definir tipo de conta");
    } finally {
      setSavingKind(null);
    }
  };

  const toggleType = (t: ProfileType) => {
    if (!allowedTypes.includes(t)) {
      toast.error(
        `Sua conta ${accountType ? ACCOUNT_TYPE_LABEL[accountType] : ""} não permite criar perfil de ${PROFILE_TYPE_LABEL[t]}.`,
      );
      return;
    }
    if (existingTypes.has(t)) {
      toast.error(
        `Você já possui um perfil de ${PROFILE_TYPE_LABEL[t]}. Edite o perfil existente em vez de criar outro.`,
      );
      return;
    }
    setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  };

  const submitAll = async () => {
    try {
      for (const t of selected) {
        if (existingTypes.has(t)) {
          toast.error(`Já existe um perfil de ${PROFILE_TYPE_LABEL[t]}. Edite o existente.`);
          return;
        }
        const f = forms[t];
        if (!f.name) {
          toast.error(`Informe um nome para o perfil de ${PROFILE_TYPE_LABEL[t]}.`);
          return;
        }
        await upsertProfile({
          type: t,
          name: f.name,
          nickname: f.nickname || null,
          city: f.city || null,
          avatar: f.avatar,
          color: f.color,
          frame: "classic",
        });
      }
      toast.success("Perfis criados!");
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar perfis");
    }
  };

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl uppercase tracking-wider sm:text-4xl">
          Bem-vindo ao <span className="text-gradient-primary">PeladaPro</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === "kind"
            ? "Escolha o tipo da sua conta. Esta decisão é permanente."
            : accountType
            ? `Conta ${ACCOUNT_TYPE_LABEL[accountType]} — você pode criar: ${allowedTypes.map((t) => PROFILE_TYPE_LABEL[t]).join(" + ")}.`
            : ""}
        </p>
      </div>

      {profiles.length > 0 && (
        <Card className="mb-4 border-primary/40 bg-primary/5 p-4 text-sm">
          Você já tem {profiles.length} perfil(is). <Link to="/perfil/editar" className="font-semibold text-primary underline underline-offset-4">Gerenciar</Link>
        </Card>
      )}

      {step === "kind" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {ACCOUNT_OPTIONS.map(({ id, icon: Icon, title, desc, allowed }) => (
              <button
                key={id}
                onClick={() => chooseKind(id)}
                disabled={savingKind !== null}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 text-left transition hover:border-primary/60 hover:shadow-glow disabled:opacity-60"
              >
                <Icon className="h-7 w-7 text-primary" />
                <div className="font-display text-xl uppercase tracking-wide">{title}</div>
                <p className="text-sm text-muted-foreground">{desc}</p>
                <span className="mt-1 inline-flex w-fit rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                  Permite: {allowed}
                </span>
                {savingKind === id && (
                  <span className="text-xs text-muted-foreground">Salvando…</span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            ⚠️ A escolha é definitiva. Contas Business nunca poderão criar perfis de Jogador ou Time, e vice-versa.
          </p>
        </>
      )}

      {step === "choose" && (
        <>
          <div className={`grid gap-4 ${visibleTypes.length > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
            {visibleTypes.map(({ id, icon: Icon, desc }) => {
              const active = selected.includes(id);
              const exists = existingTypes.has(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleType(id)}
                  disabled={exists}
                  className={`flex flex-col gap-3 rounded-xl border p-5 text-left transition ${
                    exists
                      ? "cursor-not-allowed border-border bg-muted/30 opacity-60"
                      : active
                      ? "border-primary bg-primary/10 shadow-glow"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`h-6 w-6 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="font-display text-lg uppercase tracking-wide">{PROFILE_TYPE_LABEL[id]}</div>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                  {exists && (
                    <span className="mt-1 inline-flex w-fit rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                      Já criado
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              disabled={selected.length === 0}
              className="bg-gradient-primary text-primary-foreground"
              onClick={() => setStep("fill")}
            >
              Continuar <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {step === "fill" && (
        <div className="space-y-5">
          {selected.map((t) => (
            <Card key={t} className="border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
                  style={{ background: forms[t].color + "22", color: forms[t].color }}
                >
                  {forms[t].avatar}
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Perfil</div>
                  <div className="font-display text-lg uppercase">{PROFILE_TYPE_LABEL[t]}</div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Label>Nome</Label>
                  <Input
                    value={forms[t].name}
                    onChange={(e) => setForms((s) => ({ ...s, [t]: { ...s[t], name: e.target.value } }))}
                    placeholder={t === "team" ? "Ex: Leões da Vila" : t === "field" ? "Ex: Arena Central" : "Seu nome"}
                  />
                </div>
                <div>
                  <Label>Apelido</Label>
                  <Input
                    value={forms[t].nickname}
                    onChange={(e) => setForms((s) => ({ ...s, [t]: { ...s[t], nickname: e.target.value } }))}
                    placeholder="Opcional"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label>Cidade</Label>
                  <Input
                    value={forms[t].city}
                    onChange={(e) => setForms((s) => ({ ...s, [t]: { ...s[t], city: e.target.value } }))}
                    placeholder="São Paulo"
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-2 block">Avatar</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_AVATARS_BY_TYPE[t].map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setForms((s) => ({ ...s, [t]: { ...s[t], avatar: a } }))}
                        className={`flex h-9 w-9 items-center justify-center rounded-md border text-lg transition ${
                          forms[t].avatar === a ? "border-primary bg-primary/10" : "border-border bg-surface"
                        }`}
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
                        onClick={() => setForms((s) => ({ ...s, [t]: { ...s[t], color: c } }))}
                        className={`h-8 w-8 rounded-md ring-offset-2 ring-offset-card transition ${
                          forms[t].color === c ? "ring-2 ring-primary" : ""
                        }`}
                        style={{ background: c }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("choose")}>Voltar</Button>
            <Button onClick={submitAll} className="bg-gradient-primary text-primary-foreground">
              Criar perfis
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
