import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronRight, User, Shield, MapPin, Building2, Award, Phone } from "lucide-react";
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
import { useProtectedAccess } from "@/lib/useProtectedAccess";
import { RouteLoadingSkeleton } from "@/components/RouteLoadingSkeleton";
import { CityCombobox } from "@/components/CityCombobox";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [{ title: "Configurar perfil — PeladaPro" }],
  }),
  component: OnboardingPage,
});

type Option = {
  id: ProfileType;
  account: AccountType;
  icon: typeof User;
  desc: string;
};

const OPTIONS: Option[] = [
  { id: "player", account: "sportist", icon: User, desc: "Quero jogar pelada, entrar em times e me candidatar a vagas." },
  { id: "team", account: "sportist", icon: Shield, desc: "Sou capitão de um time e quero gerenciar elenco e desafios." },
  { id: "field", account: "business_field", icon: MapPin, desc: "Sou dono ou gestor de um campo e quero anunciar horários." },
  { id: "referee", account: "business_referee", icon: Award, desc: "Sou árbitro e quero oferecer arbitragem para times e campos." },

];

function OnboardingPage() {
  const access = useProtectedAccess("auth", { authRedirect: "/auth" });
  const { session, profiles, upsertProfile, accountType, setAccountType } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ProfileType | null>(null);
  const [step, setStep] = useState<"choose" | "fill">("choose");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", nickname: "", city: "", avatar: "⚽", color: "#F59E0B" });
  const [venueForm, setVenueForm] = useState({ address: "", phone: "", bio: "" });

  // Retomar onboarding: se já tem ao menos um perfil dos permitidos, considera concluído.
  useEffect(() => {
    if (access.status !== "ready" || !accountType) return;
    const allowed = ALLOWED_PROFILE_TYPES[accountType];
    const hasAny = allowed.some((t) => profiles.some((p) => p.type === t));
    if (hasAny) {
      const dest =
        accountType === "business_field"
          ? "/painel"
          : accountType === "business_referee"
          ? "/arbitragem"
          : "/perfil";
      navigate({ to: dest });
    }
  }, [access.status, accountType, profiles, navigate]);


  const existingTypes = new Set(profiles.map((p) => p.type));

  const pickOption = (opt: Option) => {
    if (accountType && accountType !== opt.account) {
      const allowedLabels = ALLOWED_PROFILE_TYPES[accountType]
        .map((t) => PROFILE_TYPE_LABEL[t])
        .join(" ou ");
      toast.error(
        `Sua conta é ${ACCOUNT_TYPE_LABEL[accountType]} e não pode criar um perfil ${ACCOUNT_TYPE_LABEL[opt.account]}.`,
        {
          description: `A escolha entre Esportista e Business é definitiva. Você só pode criar perfis de: ${allowedLabels}.`,
          duration: 6000,
        },
      );
      return;
    }
    if (existingTypes.has(opt.id)) {
      const sameAccountOptions = OPTIONS.filter(
        (o) => o.account === opt.account && !existingTypes.has(o.id),
      );
      const remaining = sameAccountOptions.map((o) => PROFILE_TYPE_LABEL[o.id]).join(" ou ");
      toast.error(`Você já possui um perfil de ${PROFILE_TYPE_LABEL[opt.id]}.`, {
        description: remaining
          ? `Dentro de ${ACCOUNT_TYPE_LABEL[opt.account]} você ainda pode criar: ${remaining}.`
          : `Você já criou todos os perfis disponíveis para a conta ${ACCOUNT_TYPE_LABEL[opt.account]}.`,
        duration: 6000,
      });
      return;
    }
    setSelected(opt.id);
    // Inicializa avatar/color padrão para o tipo escolhido
    const avatars = PRESET_AVATARS_BY_TYPE[opt.id];
    setForm((s) => ({ ...s, avatar: avatars[0] ?? s.avatar }));
  };

  const goToFill = async () => {
    if (!selected) return;
    const opt = OPTIONS.find((o) => o.id === selected)!;
    setSaving(true);
    try {
      if (!accountType) await setAccountType(opt.account);
      setStep("fill");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao definir tipo de conta");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!selected) return;
    if (!form.name) {
      toast.error("Informe um nome para o perfil.");
      return;
    }
    try {
      await upsertProfile({
        type: selected,
        name: form.name,
        nickname: form.nickname || null,
        city: form.city || null,
        avatar: form.avatar,
        color: form.color,
        frame: "classic",
      });

      if (selected === "field" && session?.user) {
        const { data: existingVenues } = await supabase
          .from("venues" as never)
          .select("id")
          .eq("owner_user_id", session.user.id)
          .limit(1);
        if (!existingVenues || (existingVenues as { id: string }[]).length === 0) {
          const { error: venueErr } = await supabase
            .from("venues" as never)
            .insert({
              owner_user_id: session.user.id,
              name: form.name,
              city: form.city || null,
              address: venueForm.address || null,
              phone: venueForm.phone || null,
              bio: venueForm.bio || null,
            } as never);
          if (venueErr) throw venueErr;
        }
      }

      if (selected === "referee" && session?.user) {
        const { data: existingRef } = await supabase
          .from("referees" as never)
          .select("referee_id")
          .eq("referee_id", session.user.id)
          .maybeSingle();
        if (!existingRef) {
          const { error: refErr } = await supabase
            .from("referees" as never)
            .insert({
              referee_id: session.user.id,
              display_name: form.name,
              city: form.city || null,
              tier: "bronze",
              active: true,
            } as never);
          if (refErr) throw refErr;
        }
      }

      toast.success("Perfil criado!");
      const dest =
        selected === "field" ? "/painel" : selected === "referee" ? "/arbitragem" : "/perfil";
      navigate({ to: dest });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar perfil");
    }
  };

  if (access.status === "loading") {
    return <RouteLoadingSkeleton label="Carregando onboarding" />;
  }

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl uppercase tracking-wider sm:text-4xl">
          Bem-vindo ao <span className="text-gradient-primary">PeladaPro</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === "choose"
            ? "Escolha o tipo do seu perfil. Esta decisão define sua categoria de conta e é permanente."
            : `Preencha os dados do seu perfil de ${PROFILE_TYPE_LABEL[selected!]}.`}
        </p>
      </div>

      {profiles.length > 0 && (
        <Card className="mb-4 border-primary/40 bg-primary/5 p-4 text-sm">
          Você já tem {profiles.length} perfil(is).{" "}
          <Link to="/perfil/editar" className="font-semibold text-primary underline underline-offset-4">
            Gerenciar
          </Link>
        </Card>
      )}

      {step === "choose" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {OPTIONS.map((opt) => {
              const { id, account, icon: Icon, desc } = opt;
              const active = selected === id;
              const exists = existingTypes.has(id);
              const blockedByAccount = accountType !== null && accountType !== account;
              const disabled = exists || blockedByAccount;
              const isReferee = id === "referee";
              return (
                <button
                  key={id}
                  onClick={() => pickOption(opt)}
                  disabled={disabled}
                  className={`flex flex-col gap-3 rounded-xl border p-5 text-left transition ${
                    disabled
                      ? "cursor-not-allowed border-border bg-muted/30 opacity-60"
                      : active
                      ? isReferee
                        ? "border-referee bg-referee/10 shadow-glow-referee"
                        : "border-primary bg-primary/10 shadow-glow"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon
                      className={`h-6 w-6 ${
                        active ? (isReferee ? "text-referee" : "text-primary") : "text-muted-foreground"
                      }`}
                    />
                    {active && (
                      <Check className={`h-4 w-4 ${isReferee ? "text-referee" : "text-primary"}`} />
                    )}
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {ACCOUNT_TYPE_LABEL[account]}
                    </div>
                    <div className="font-display text-lg uppercase tracking-wide">
                      {ACCOUNT_TYPE_LABEL[account]}: {PROFILE_TYPE_LABEL[id]}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                  {exists && (
                    <span className="mt-1 inline-flex w-fit rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                      Já criado
                    </span>
                  )}
                  {blockedByAccount && !exists && (
                    <span className="mt-1 inline-flex w-fit rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Bloqueado pela sua conta {ACCOUNT_TYPE_LABEL[accountType!]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            ⚠️ A escolha entre Esportista e Business é definitiva. Você só pode selecionar um perfil aqui.
          </p>
          <div className="mt-6 flex justify-end">
            <Button
              disabled={!selected || saving}
              className="bg-gradient-primary text-primary-foreground"
              onClick={goToFill}
            >
              Continuar <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {step === "fill" && selected && (
        <div className="space-y-5">
          <Card className="border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
                style={{ background: form.color + "22", color: form.color }}
              >
                {form.avatar}
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Perfil
                </div>
                <div className="font-display text-lg uppercase">{PROFILE_TYPE_LABEL[selected]}</div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder={
                    selected === "team"
                      ? "Ex: Leões da Vila"
                      : selected === "field"
                      ? "Ex: Arena Central"
                      : "Seu nome"
                  }
                />
              </div>
              <div>
                <Label>Apelido</Label>
                <Input
                  value={form.nickname}
                  onChange={(e) => setForm((s) => ({ ...s, nickname: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
              <div className="sm:col-span-3">
                <Label>Cidade</Label>
                <CityCombobox
                  value={form.city}
                  onChange={(v) => setForm((s) => ({ ...s, city: v }))}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block">Avatar</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_AVATARS_BY_TYPE[selected].map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setForm((s) => ({ ...s, avatar: a }))}
                      className={`flex h-9 w-9 items-center justify-center rounded-md border text-lg transition ${
                        form.avatar === a ? "border-primary bg-primary/10" : "border-border bg-surface"
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
                      onClick={() => setForm((s) => ({ ...s, color: c }))}
                      className={`h-8 w-8 rounded-md ring-offset-2 ring-offset-card transition ${
                        form.color === c ? "ring-2 ring-primary" : ""
                      }`}
                      style={{ background: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            {selected === "field" && (
              <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-sm uppercase tracking-wider">
                    Dados do Estabelecimento
                  </h3>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Cadastre o complexo agora. Os campos físicos você adiciona depois em{" "}
                  <strong className="text-foreground">Adicionar campos</strong>.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Endereço</Label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        value={venueForm.address}
                        onChange={(e) => setVenueForm((s) => ({ ...s, address: e.target.value }))}
                        placeholder="Rua, número, bairro"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        value={venueForm.phone}
                        onChange={(e) => setVenueForm((s) => ({ ...s, phone: e.target.value }))}
                        placeholder="(11) 99999-0000"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Descrição do complexo</Label>
                    <Textarea
                      rows={3}
                      value={venueForm.bio}
                      onChange={(e) => setVenueForm((s) => ({ ...s, bio: e.target.value }))}
                      placeholder="Conte sobre estrutura, vestiários, estacionamento…"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("choose")}>
              Voltar
            </Button>
            <Button onClick={submit} className="bg-gradient-primary text-primary-foreground">
              Criar perfil
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
