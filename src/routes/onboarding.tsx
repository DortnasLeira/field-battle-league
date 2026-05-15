import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User, Shield, Briefcase, MapPin, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AccountType, PRESET_AVATARS_BY_TYPE, PRESET_COLORS } from "@/lib/auth";
import { Stepper, Step, StepperSeparator } from "@/components/ui/stepper";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [{ title: "Configurar Conta — PeladaPro" }],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { session, loading, accountType, onboardingStep, updateOnboardingProgress, upsertProfile, updateProfile, profiles } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AccountType | null>(null);

  // Forms
  const [basicForm, setBasicForm] = useState({ name: "", nickname: "", city: "", address: "" });
  const [customForm, setCustomForm] = useState({ avatar: "", color: "#F59E0B", bio: "", phone: "" });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (accountType && !selectedRole) setSelectedRole(accountType);
  }, [accountType, selectedRole]);

  useEffect(() => {
    if (onboardingStep >= 100) {
      const dest = accountType === "business" ? "/complexo" : accountType === "team" ? "/painel" : "/perfil";
      navigate({ to: dest });
    }
  }, [onboardingStep, accountType, navigate]);

  const handleSelectRole = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await updateOnboardingProgress(1, selectedRole);
    } catch (e) {
      toast.error("Erro ao salvar tipo de conta");
    } finally {
      setSaving(false);
    }
  };

  const handleBasicSubmit = async () => {
    if (!basicForm.name) return toast.error("O nome é obrigatório");
    setSaving(true);
    try {
      const type = accountType === "business" ? "field" : accountType!;
      const avatar = accountType === "player" ? "⚽" : accountType === "team" ? "🦁" : "🏟️";
      
      await upsertProfile({
        type: type,
        name: basicForm.name,
        nickname: basicForm.nickname || null,
        city: basicForm.city || null,
        avatar,
        color: customForm.color,
        frame: "classic",
      });

      if (accountType === "business" && session?.user) {
        // Upsert simple venue representation
        const { data: existingVenues } = await supabase
          .from("venues" as never)
          .select("id")
          .eq("owner_user_id", session.user.id)
          .limit(1);

        if (!existingVenues || (existingVenues as any[]).length === 0) {
          const { error: venueErr } = await supabase
            .from("venues" as never)
            .insert({
              owner_user_id: session.user.id,
              name: basicForm.name,
              city: basicForm.city || null,
              address: basicForm.address || null,
            } as never);
          if (venueErr) throw venueErr;
        }
      }

      await updateOnboardingProgress(2);
      
      // Initialize default avatar randomly if needed
      if (accountType !== "business" && !customForm.avatar) {
        const presets = PRESET_AVATARS_BY_TYPE[accountType as "player" | "team"];
        setCustomForm(s => ({...s, avatar: presets[Math.floor(Math.random() * presets.length)]}));
      }
    } catch (e) {
      toast.error("Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleCustomSubmit = async () => {
    setSaving(true);
    try {
      const type = accountType === "business" ? "field" : accountType!;
      const prof = profiles.find((p) => p.type === type);
      if (prof) {
        await updateProfile(prof.id, {
          avatar: customForm.avatar || prof.avatar,
          color: customForm.color || prof.color,
        });
      }

      if (accountType === "business" && session?.user) {
        await supabase
          .from("venues" as never)
          .update({
            bio: customForm.bio || null,
            phone: customForm.phone || null,
          } as never)
          .eq("owner_user_id", session.user.id);
      }

      await updateOnboardingProgress(100);
      toast.success("Tudo pronto! Bem-vindo.");
    } catch (e) {
      toast.error("Erro ao finalizar");
    } finally {
      setSaving(false);
    }
  };

  // Prevent flicker before redirect
  if (onboardingStep >= 100) return null;

  const currentStep = Math.min(onboardingStep, 2);

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl uppercase tracking-wider sm:text-4xl">
          Complete seu Cadastro
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Falta pouco para você entrar em campo.</p>
      </div>

      <div className="mb-8 px-4 sm:px-12">
        <Stepper activeStep={currentStep + 1}>
          <Step step={1} title="Função" />
          <StepperSeparator />
          <Step step={2} title="Detalhes" />
          <StepperSeparator />
          <Step step={3} title="Visual" />
        </Stepper>
      </div>

      <div className="mt-8">
        {currentStep === 0 && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Como você vai usar o PeladaPro?</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <button
                onClick={() => setSelectedRole("player")}
                className={`flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition ${selectedRole === "player" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
              >
                <User className={`h-8 w-8 ${selectedRole === "player" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <div className="font-semibold">Jogador</div>
                  <div className="text-xs text-muted-foreground mt-1">Jogar peladas e buscar times</div>
                </div>
              </button>
              <button
                onClick={() => setSelectedRole("team")}
                className={`flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition ${selectedRole === "team" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
              >
                <Shield className={`h-8 w-8 ${selectedRole === "team" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <div className="font-semibold">Time</div>
                  <div className="text-xs text-muted-foreground mt-1">Gerenciar elenco e jogar ligas</div>
                </div>
              </button>
              <button
                onClick={() => setSelectedRole("business")}
                className={`flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition ${selectedRole === "business" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
              >
                <Briefcase className={`h-8 w-8 ${selectedRole === "business" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <div className="font-semibold">Complexo</div>
                  <div className="text-xs text-muted-foreground mt-1">Alugar campos e horários</div>
                </div>
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <Button disabled={!selectedRole || saving} onClick={handleSelectRole} className="bg-gradient-primary text-primary-foreground shadow-glow">
                {saving ? "Salvando..." : "Continuar"}
              </Button>
            </div>
          </Card>
        )}

        {currentStep === 1 && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">
              {accountType === "business" ? "Dados do Complexo" : accountType === "team" ? "Dados do Time" : "Seus Dados"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nome {accountType === "business" ? "do Complexo" : accountType === "team" ? "do Time" : "Completo"}</Label>
                <Input value={basicForm.name} onChange={(e) => setBasicForm(s => ({...s, name: e.target.value}))} />
              </div>
              {accountType === "player" && (
                <div>
                  <Label>Apelido</Label>
                  <Input value={basicForm.nickname} onChange={(e) => setBasicForm(s => ({...s, nickname: e.target.value}))} />
                </div>
              )}
              <div className={accountType === "business" ? "sm:col-span-1" : "sm:col-span-2"}>
                <Label>Cidade</Label>
                <Input value={basicForm.city} onChange={(e) => setBasicForm(s => ({...s, city: e.target.value}))} />
              </div>
              {accountType === "business" && (
                <div className="sm:col-span-2">
                  <Label>Endereço Completo</Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" value={basicForm.address} onChange={(e) => setBasicForm(s => ({...s, address: e.target.value}))} />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <Button disabled={!basicForm.name || saving} onClick={handleBasicSubmit} className="bg-gradient-primary text-primary-foreground shadow-glow">
                {saving ? "Salvando..." : "Continuar"}
              </Button>
            </div>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">
              {accountType === "business" ? "Detalhes do Local" : "Personalize seu Perfil"}
            </h2>
            <div className="space-y-6">
              {accountType !== "business" && (
                <>
                  <div>
                    <Label className="mb-2 block">Selecione um Ícone</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_AVATARS_BY_TYPE[accountType as "player" | "team"].map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setCustomForm(s => ({...s, avatar: a}))}
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
                          onClick={() => setCustomForm(s => ({...s, color: c}))}
                          className={`h-10 w-10 rounded-full ring-offset-2 ring-offset-card transition ${customForm.color === c ? "ring-2 ring-primary" : ""}`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {accountType === "business" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Telefone</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input className="pl-9" value={customForm.phone} onChange={(e) => setCustomForm(s => ({...s, phone: e.target.value}))} />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Descrição do Complexo</Label>
                    <Textarea value={customForm.bio} onChange={(e) => setCustomForm(s => ({...s, bio: e.target.value}))} rows={4} />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="outline" disabled={saving} onClick={() => updateOnboardingProgress(1)}>
                Voltar
              </Button>
              <Button disabled={saving || (accountType !== 'business' && !customForm.avatar)} onClick={handleCustomSubmit} className="bg-gradient-primary text-primary-foreground shadow-glow">
                {saving ? "Finalizando..." : "Concluir"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
