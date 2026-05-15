import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { User, Shield, Briefcase, MapPin, Phone, Building2, Flag as Whistle, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useAuth,
  type AccountType,
  type BusinessKind,
  type ProfileType,
  PRESET_AVATARS_BY_TYPE,
  PRESET_COLORS,
} from "@/lib/auth";
import { Stepper, Step, StepperSeparator } from "@/components/ui/stepper";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Configurar Conta — PeladaPro" }] }),
  component: OnboardingPage,
});

// Steps:
// 0 = pick role
// 1 = business → pick kind (campo or árbitro)
// 2 = basic data
// 3 = customisation
// 100 = done
function OnboardingPage() {
  const {
    session,
    loading,
    accountType,
    businessKind,
    onboardingStep,
    updateOnboardingProgress,
    upsertProfile,
    updateProfile,
    profiles,
  } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AccountType | null>(null);
  const [selectedKind, setSelectedKind] = useState<BusinessKind | null>(null);

  const [basicForm, setBasicForm] = useState({ name: "", nickname: "", city: "", address: "", pricePerGame: "" });
  const [customForm, setCustomForm] = useState({ avatar: "", color: "#F59E0B", bio: "", phone: "" });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (accountType && !selectedRole) setSelectedRole(accountType);
  }, [accountType, selectedRole]);

  useEffect(() => {
    if (businessKind && !selectedKind) setSelectedKind(businessKind);
  }, [businessKind, selectedKind]);

  // Resolve the actual sub-profile type to be created
  const profileType: ProfileType | null = useMemo(() => {
    if (accountType === "business") return businessKind ?? null;
    if (accountType) return accountType;
    return null;
  }, [accountType, businessKind]);

  useEffect(() => {
    if (onboardingStep >= 100) {
      const dest =
        accountType === "business"
          ? businessKind === "referee" ? "/arbitragem" : "/complexo"
          : accountType === "team"
            ? "/painel"
            : "/perfil";
      navigate({ to: dest });
    }
  }, [onboardingStep, accountType, businessKind, navigate]);

  if (onboardingStep >= 100) return null;

  const handleSelectRole = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      // For non-business, jump straight to step 2 (basic). Business needs kind first (step 1).
      const next = selectedRole === "business" ? 1 : 2;
      await updateOnboardingProgress(next, selectedRole);
    } catch {
      toast.error("Erro ao salvar tipo de conta");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectKind = async () => {
    if (!selectedKind) return;
    setSaving(true);
    try {
      await updateOnboardingProgress(2, undefined, selectedKind);
    } catch {
      toast.error("Erro ao salvar escolha");
    } finally {
      setSaving(false);
    }
  };

  const handleBasicSubmit = async () => {
    if (!basicForm.name) return toast.error("O nome é obrigatório");
    if (!profileType) return toast.error("Escolha o tipo de perfil primeiro.");
    setSaving(true);
    try {
      const defaultAvatar =
        profileType === "player" ? "⚽"
        : profileType === "team" ? "🦁"
        : profileType === "field" ? "🏟️"
        : "🟨";

      await upsertProfile({
        type: profileType,
        name: basicForm.name,
        nickname: basicForm.nickname || null,
        city: basicForm.city || null,
        avatar: defaultAvatar,
        color: customForm.color,
        frame: "classic",
      });

      // Side-effects per kind
      if (accountType === "business" && session?.user) {
        if (businessKind === "field") {
          const { data: existingVenues } = await supabase
            .from("venues")
            .select("id")
            .eq("owner_user_id", session.user.id)
            .limit(1);
          if (!existingVenues || existingVenues.length === 0) {
            const { error: venueErr } = await supabase
              .from("venues")
              .insert({
                owner_user_id: session.user.id,
                name: basicForm.name,
                city: basicForm.city || null,
                address: basicForm.address || null,
              } as never);
            if (venueErr) throw venueErr;
          }
        } else if (businessKind === "referee") {
          // Bootstrap referee row so he is searchable / hireable
          const { data: existingRef } = await supabase
            .from("referees")
            .select("referee_id")
            .eq("referee_id", session.user.id)
            .maybeSingle();
          if (!existingRef) {
            const price = Number(basicForm.pricePerGame) || 0;
            const { error: refErr } = await supabase
              .from("referees")
              .insert({
                referee_id: session.user.id,
                display_name: basicForm.name,
                city: basicForm.city || null,
                price_per_game: price,
                tier: "bronze",
              } as never);
            if (refErr) throw refErr;
          }
        }
      }

      await updateOnboardingProgress(3);
    } catch (e) {
      toast.error((e as Error).message || "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleCustomSubmit = async () => {
    if (!profileType) return;
    setSaving(true);
    try {
      const prof = profiles.find((p) => p.type === profileType);
      if (prof) {
        await updateProfile(prof.id, {
          avatar: customForm.avatar || prof.avatar,
          color: customForm.color || prof.color,
          bio: customForm.bio || prof.bio,
        });
      }

      if (accountType === "business" && session?.user) {
        if (businessKind === "field") {
          await supabase
            .from("venues")
            .update({ bio: customForm.bio || null, phone: customForm.phone || null } as never)
            .eq("owner_user_id", session.user.id);
        } else if (businessKind === "referee") {
          await supabase
            .from("referees")
            .update({ bio: customForm.bio || null } as never)
            .eq("referee_id", session.user.id);
        }
      }

      await updateOnboardingProgress(100);
      toast.success("Tudo pronto! Bem-vindo.");
    } catch {
      toast.error("Erro ao finalizar");
    } finally {
      setSaving(false);
    }
  };

  // Compute current visible step (0..3)
  const currentStep = Math.min(onboardingStep, 3);
  const stepperActive = currentStep + 1;

  // Avatar presets only for non-business OR referee
  const avatarPresetType: ProfileType | null = useMemo(() => {
    if (!profileType) return null;
    if (profileType === "field") return null; // field has no preset avatars in onboarding
    return profileType;
  }, [profileType]);

  const titleForBasic = (() => {
    if (businessKind === "referee") return "Dados do Árbitro";
    if (businessKind === "field") return "Dados do Complexo";
    if (accountType === "team") return "Dados do Time";
    return "Seus Dados";
  })();

  const titleForCustom = businessKind === "referee"
    ? "Personalize seu perfil de árbitro"
    : businessKind === "field"
      ? "Detalhes do Local"
      : "Personalize seu Perfil";

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl uppercase tracking-wider sm:text-4xl">Complete seu Cadastro</h1>
        <p className="mt-2 text-sm text-muted-foreground">Falta pouco para você entrar em campo.</p>
      </div>

      <div className="mb-8 px-4 sm:px-12">
        <Stepper activeStep={stepperActive}>
          <Step step={1} title="Função" />
          <StepperSeparator />
          <Step step={2} title={accountType === "business" ? "Negócio" : "Detalhes"} />
          <StepperSeparator />
          <Step step={3} title="Dados" />
          <StepperSeparator />
          <Step step={4} title="Visual" />
        </Stepper>
      </div>

      <div className="mt-8">
        {currentStep === 0 && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Como você vai usar o PeladaPro?</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <RoleButton selected={selectedRole === "player"} onClick={() => setSelectedRole("player")} icon={<User className="h-8 w-8" />} title="Jogador" subtitle="Jogar peladas e buscar times" />
              <RoleButton selected={selectedRole === "team"} onClick={() => setSelectedRole("team")} icon={<Shield className="h-8 w-8" />} title="Time" subtitle="Gerenciar elenco e jogar ligas" />
              <RoleButton selected={selectedRole === "business"} onClick={() => setSelectedRole("business")} icon={<Briefcase className="h-8 w-8" />} title="Negócio" subtitle="Complexo de campos ou árbitro" />
            </div>
            <div className="mt-6 flex justify-end">
              <Button disabled={!selectedRole || saving} onClick={handleSelectRole} className="bg-gradient-primary text-primary-foreground shadow-glow">
                {saving ? "Salvando..." : "Continuar"}
              </Button>
            </div>
          </Card>
        )}

        {currentStep === 1 && accountType === "business" && (
          <Card className="p-6">
            <h2 className="mb-1 text-xl font-semibold">Que tipo de negócio é o seu?</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Escolha apenas uma opção. Não é possível ter Complexo e Árbitro na mesma conta.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <RoleButton
                selected={selectedKind === "field"}
                onClick={() => setSelectedKind("field")}
                icon={<Building2 className="h-8 w-8" />}
                title="Complexo / Campo"
                subtitle="Aluga campos e horários para jogadores e times"
              />
              <RoleButton
                selected={selectedKind === "referee"}
                onClick={() => setSelectedKind("referee")}
                icon={<Whistle className="h-8 w-8" />}
                title="Árbitro"
                subtitle="Apita jogos contratado por times ou campos"
                accent="referee"
              />
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="outline" disabled={saving} onClick={() => updateOnboardingProgress(0)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
              </Button>
              <Button disabled={!selectedKind || saving} onClick={handleSelectKind} className="bg-gradient-primary text-primary-foreground shadow-glow">
                {saving ? "Salvando..." : "Continuar"}
              </Button>
            </div>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">{titleForBasic}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>
                  Nome {businessKind === "field" ? "do Complexo"
                    : businessKind === "referee" ? "Profissional"
                    : accountType === "team" ? "do Time"
                    : "Completo"}
                </Label>
                <Input value={basicForm.name} onChange={(e) => setBasicForm(s => ({ ...s, name: e.target.value }))} />
              </div>
              {accountType === "player" && (
                <div>
                  <Label>Apelido</Label>
                  <Input value={basicForm.nickname} onChange={(e) => setBasicForm(s => ({ ...s, nickname: e.target.value }))} />
                </div>
              )}
              <div className={businessKind === "field" ? "sm:col-span-1" : "sm:col-span-2"}>
                <Label>Cidade</Label>
                <Input value={basicForm.city} onChange={(e) => setBasicForm(s => ({ ...s, city: e.target.value }))} />
              </div>
              {businessKind === "field" && (
                <div className="sm:col-span-2">
                  <Label>Endereço Completo</Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" value={basicForm.address} onChange={(e) => setBasicForm(s => ({ ...s, address: e.target.value }))} />
                  </div>
                </div>
              )}
              {businessKind === "referee" && (
                <div className="sm:col-span-2">
                  <Label>Preço sugerido por jogo (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Ex.: 120"
                    value={basicForm.pricePerGame}
                    onChange={(e) => setBasicForm(s => ({ ...s, pricePerGame: e.target.value }))}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">Você pode ajustar isso depois no seu perfil.</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="outline" disabled={saving} onClick={() => updateOnboardingProgress(accountType === "business" ? 1 : 0)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
              </Button>
              <Button disabled={!basicForm.name || saving} onClick={handleBasicSubmit} className="bg-gradient-primary text-primary-foreground shadow-glow">
                {saving ? "Salvando..." : "Continuar"}
              </Button>
            </div>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">{titleForCustom}</h2>
            <div className="space-y-6">
              {avatarPresetType && (
                <>
                  <div>
                    <Label className="mb-2 block">Selecione um Ícone</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_AVATARS_BY_TYPE[avatarPresetType].map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setCustomForm(s => ({ ...s, avatar: a }))}
                          className={`flex h-12 w-12 items-center justify-center rounded-xl border text-2xl transition ${customForm.avatar === a ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface"}`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Cor Destaque</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCustomForm(s => ({ ...s, color: c }))}
                          className={`h-10 w-10 rounded-full ring-offset-2 ring-offset-card transition ${customForm.color === c ? "ring-2 ring-primary" : ""}`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {(businessKind === "field" || businessKind === "referee") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {businessKind === "field" && (
                    <div>
                      <Label>Telefone</Label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-9" value={customForm.phone} onChange={(e) => setCustomForm(s => ({ ...s, phone: e.target.value }))} />
                      </div>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <Label>{businessKind === "referee" ? "Bio profissional" : "Descrição do Complexo"}</Label>
                    <Textarea
                      value={customForm.bio}
                      onChange={(e) => setCustomForm(s => ({ ...s, bio: e.target.value }))}
                      rows={4}
                      placeholder={businessKind === "referee" ? "Apresente sua experiência, federações, especialidades…" : ""}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="outline" disabled={saving} onClick={() => updateOnboardingProgress(2)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
              </Button>
              <Button
                disabled={saving || (avatarPresetType !== null && !customForm.avatar)}
                onClick={handleCustomSubmit}
                className="bg-gradient-primary text-primary-foreground shadow-glow"
              >
                {saving ? "Finalizando..." : "Concluir"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function RoleButton({
  selected, onClick, icon, title, subtitle, accent,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent?: "referee";
}) {
  const ring = accent === "referee"
    ? selected ? "border-referee bg-referee/10" : "border-border hover:border-referee/50"
    : selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50";
  const iconColor = accent === "referee"
    ? selected ? "text-referee" : "text-muted-foreground"
    : selected ? "text-primary" : "text-muted-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition ${ring}`}
    >
      <span className={iconColor}>{icon}</span>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
      </div>
    </button>
  );
}
