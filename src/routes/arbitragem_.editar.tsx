import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Award, Loader2, Save, Calendar, Clock, DollarSign, Power, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { CityCombobox } from "@/components/CityCombobox";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/arbitragem_/editar")({
  head: () => ({ meta: [{ title: "Editar perfil de árbitro — PeladaPro" }] }),
  component: EditRefereePage,
});

const DAYS: { id: string; label: string }[] = [
  { id: "mon", label: "Seg" }, { id: "tue", label: "Ter" }, { id: "wed", label: "Qua" },
  { id: "thu", label: "Qui" }, { id: "fri", label: "Sex" }, { id: "sat", label: "Sáb" },
  { id: "sun", label: "Dom" },
];
const TIMES = Array.from({ length: 17 }, (_, i) => `${String(7 + i).padStart(2, "0")}:00`);

const TIER_LABEL: Record<"bronze" | "silver" | "gold", string> = {
  bronze: "Bronze — Iniciante",
  silver: "Prata — Regional",
  gold: "Ouro — Nacional/Federado",
};

type Referee = {
  referee_id: string;
  display_name: string;
  city: string | null;
  bio: string | null;
  tier: "bronze" | "silver" | "gold";
  experience_years: number;
  price_per_game: number;
  certifications: string[];
  available_days: string[];
  available_times: string[];
  active: boolean;
};

function EditRefereePage() {
  const { session, accountType, profiles, loading } = useAuth();
  const navigate = useNavigate();
  const [ref, setRef] = useState<Referee | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCert, setNewCert] = useState("");

  const isReferee = isBusinessAccount(accountType) && profiles.some((p) => p.type === "referee");

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/auth", search: { redirect: "/arbitragem/editar" } });
      return;
    }
    if (!isReferee) {
      toast.error("Apenas árbitros podem acessar esta página.");
      navigate({ to: "/" });
    }
  }, [session, loading, isReferee, navigate]);

  useEffect(() => {
    (async () => {
      if (!session?.user) return;
      const { data, error } = await supabase
        .from("referees" as never)
        .select("*")
        .eq("referee_id", session.user.id)
        .maybeSingle();
      if (error) {
        toast.error(error.message);
        setLoadingData(false);
        return;
      }
      const r = (data as Referee | null) ?? null;
      if (r) {
        setRef(r);
      } else {
        // Cria registro base caso não exista (perfil antigo sem entrada em referees).
        const refereeProfile = profiles.find((p) => p.type === "referee");
        const seed: Referee = {
          referee_id: session.user.id,
          display_name: refereeProfile?.name ?? "Árbitro",
          city: refereeProfile?.city ?? null,
          bio: null,
          tier: "bronze",
          experience_years: 0,
          price_per_game: 0,
          certifications: [],
          available_days: [],
          available_times: [],
          active: true,
        };
        const { error: insErr } = await supabase
          .from("referees" as never)
          .insert(seed as never);
        if (insErr) toast.error(insErr.message);
        setRef(seed);
      }
      setLoadingData(false);
    })();
  }, [session, profiles]);

  const toggleDay = (d: string) => {
    setRef((s) => s ? {
      ...s,
      available_days: s.available_days.includes(d)
        ? s.available_days.filter((x) => x !== d)
        : [...s.available_days, d],
    } : s);
  };
  const toggleTime = (t: string) => {
    setRef((s) => s ? {
      ...s,
      available_times: s.available_times.includes(t)
        ? s.available_times.filter((x) => x !== t)
        : [...s.available_times, t].sort(),
    } : s);
  };
  const addCert = () => {
    const v = newCert.trim();
    if (!v || !ref) return;
    if (ref.certifications.includes(v)) {
      setNewCert("");
      return;
    }
    setRef({ ...ref, certifications: [...ref.certifications, v] });
    setNewCert("");
  };
  const removeCert = (c: string) => {
    setRef((s) => s ? { ...s, certifications: s.certifications.filter((x) => x !== c) } : s);
  };

  const save = async () => {
    if (!ref) return;
    if (!ref.display_name.trim()) {
      toast.error("Nome de exibição é obrigatório.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("referees" as never)
      .update({
        display_name: ref.display_name.trim(),
        city: ref.city?.trim() || null,
        bio: ref.bio?.trim() || null,
        tier: ref.tier,
        experience_years: Number(ref.experience_years) || 0,
        price_per_game: Number(ref.price_per_game) || 0,
        certifications: ref.certifications,
        available_days: ref.available_days,
        available_times: ref.available_times,
        active: ref.active,
      } as never)
      .eq("referee_id", ref.referee_id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Perfil de árbitro atualizado.");
    navigate({ to: "/arbitragem" });
  };

  if (loadingData || !ref) {
    return (
      <Card className="flex items-center justify-center p-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/arbitragem"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
      </Button>

      <div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Award className="h-5 w-5 text-referee" />
          <span className="font-mono text-[10px] uppercase tracking-wider">Árbitro</span>
        </div>
        <h1 className="mt-1 font-display text-3xl uppercase tracking-wider">
          Editar perfil de <span className="text-referee">árbitro</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure tier, certificações, preço por jogo e disponibilidade. Times e campos verão essas
          informações ao contratar.
        </p>
      </div>

      <Card className="space-y-4 border-border bg-card p-5">
        <h2 className="font-display text-lg uppercase tracking-wide">Dados profissionais</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome de exibição *</Label>
            <Input value={ref.display_name} onChange={(e) => setRef({ ...ref, display_name: e.target.value })} />
          </div>
          <div>
            <Label>Cidade</Label>
            <CityCombobox value={ref.city ?? ""} onChange={(v) => setRef({ ...ref, city: v })} />
          </div>
          <div>
            <Label>Nível (tier)</Label>
            <Select value={ref.tier} onValueChange={(v) => setRef({ ...ref, tier: v as Referee["tier"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bronze">{TIER_LABEL.bronze}</SelectItem>
                <SelectItem value="silver">{TIER_LABEL.silver}</SelectItem>
                <SelectItem value="gold">{TIER_LABEL.gold}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Anos de experiência</Label>
            <Input
              type="number"
              min={0}
              value={ref.experience_years}
              onChange={(e) => setRef({ ...ref, experience_years: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Preço por jogo (R$)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={ref.price_per_game}
              onChange={(e) => setRef({ ...ref, price_per_game: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Bio</Label>
            <Textarea
              rows={3}
              value={ref.bio ?? ""}
              onChange={(e) => setRef({ ...ref, bio: e.target.value })}
              placeholder="Conte sua experiência, modalidades, federações…"
            />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <Power className={cn("h-4 w-4", ref.active ? "text-emerald-500" : "text-amber-500")} />
              <div>
                <div className="text-sm font-semibold">{ref.active ? "Disponível" : "Indisponível"}</div>
                <div className="text-[11px] text-muted-foreground">
                  {ref.active ? "Aparece nas buscas e pode receber pedidos." : "Oculto e sem novos pedidos."}
                </div>
              </div>
            </div>
            <Switch checked={ref.active} onCheckedChange={(v) => setRef({ ...ref, active: v })} />
          </div>
        </div>
      </Card>

      <Card className="space-y-4 border-border bg-card p-5">
        <h2 className="font-display text-lg uppercase tracking-wide">Certificações</h2>
        <div className="flex gap-2">
          <Input
            value={newCert}
            onChange={(e) => setNewCert(e.target.value)}
            placeholder="Ex: CBF Bronze, FPF Regional…"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCert(); } }}
          />
          <Button type="button" onClick={addCert} variant="outline">
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ref.certifications.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma certificação adicionada.</p>
          ) : (
            ref.certifications.map((c) => (
              <Badge key={c} variant="outline" className="gap-1 border-referee/40 text-referee">
                {c}
                <button type="button" onClick={() => removeCert(c)} aria-label={`Remover ${c}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
      </Card>

      <Card className="space-y-4 border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-referee" />
          <h2 className="font-display text-lg uppercase tracking-wide">Disponibilidade</h2>
        </div>

        <div>
          <Label className="mb-2 block">Dias da semana</Label>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d) => {
              const on = ref.available_days.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(d.id)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition",
                    on
                      ? "border-referee bg-referee/15 text-referee"
                      : "border-border text-muted-foreground hover:border-referee/40",
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label className="mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Horários (slots de 1h)
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {TIMES.map((t) => {
              const on = ref.available_times.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTime(t)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 font-mono text-xs transition",
                    on
                      ? "border-referee bg-referee/15 text-referee"
                      : "border-border text-muted-foreground hover:border-referee/40",
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Selecione os horários em que você aceita arbitrar.
          </p>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-gradient-referee text-background shadow-glow-referee">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar perfil
        </Button>
      </div>
    </div>
  );
}
