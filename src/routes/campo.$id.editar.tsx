import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, Loader2, Calendar, Clock, DollarSign, Power } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProtectedAccess } from "@/lib/useProtectedAccess";
import { RouteLoadingSkeleton } from "@/components/RouteLoadingSkeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/campo/$id/editar")({
  head: () => ({
    meta: [{ title: "Editar campo — PeladaPro" }],
  }),
  component: FieldEditPage,
});

const DAYS: { id: string; label: string }[] = [
  { id: "mon", label: "Seg" }, { id: "tue", label: "Ter" }, { id: "wed", label: "Qua" },
  { id: "thu", label: "Qui" }, { id: "fri", label: "Sex" }, { id: "sat", label: "Sáb" },
  { id: "sun", label: "Dom" },
];
const TIMES = Array.from({ length: 17 }, (_, i) => `${String(7 + i).padStart(2, "0")}:00`);

type SubField = {
  id: string;
  venue_id: string;
  name: string;
  price_per_hour: number;
  active: boolean;
  available_days: string[];
  available_times: string[];
};

function FieldEditPage() {
  const { id } = Route.useParams();
  const access = useProtectedAccess("auth", { redirectBack: `/campo/${id}/editar` });
  const { session } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sf, setSf] = useState<SubField | null>(null);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (access.status !== "ready") return;
    let cancel = false;
    (async () => {
      const { data: f } = await supabase
        .from("sub_fields" as never)
        .select("id,venue_id,name,price_per_hour,active,available_days,available_times")
        .eq("id", id)
        .maybeSingle();
      if (cancel) return;
      const field = (f as SubField | null) ?? null;
      setSf(field);
      if (field?.venue_id && session?.user) {
        const { data: v } = await supabase
          .from("venues" as never)
          .select("owner_user_id")
          .eq("id", field.venue_id)
          .maybeSingle();
        const ok = !!v && (v as { owner_user_id: string }).owner_user_id === session.user.id;
        setAuthorized(ok);
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [id, session]);

  const toggleDay = (d: string) =>
    setSf((s) => s ? { ...s, available_days: s.available_days.includes(d)
      ? s.available_days.filter((x) => x !== d)
      : [...s.available_days, d] } : s);

  const toggleTime = (t: string) =>
    setSf((s) => s ? { ...s, available_times: s.available_times.includes(t)
      ? s.available_times.filter((x) => x !== t)
      : [...s.available_times, t].sort() } : s);

  const save = async () => {
    if (!sf) return;
    if (sf.price_per_hour < 0) {
      toast.error("Preço inválido.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("sub_fields" as never)
      .update({
        name: sf.name,
        price_per_hour: sf.price_per_hour,
        active: sf.active,
        available_days: sf.available_days,
        available_times: sf.available_times,
      } as never)
      .eq("id", sf.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Campo atualizado.");
    navigate({ to: "/campo/$id", params: { id: sf.id } });
  };

  if (loading || authLoading) {
    return (
      <Card className="flex items-center justify-center p-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
      </Card>
    );
  }

  if (!sf) {
    return (
      <Card className="space-y-3 p-10 text-center">
        <h2 className="font-display text-xl uppercase">Campo não encontrado</h2>
        <Button asChild variant="outline"><Link to="/perfil">Voltar</Link></Button>
      </Card>
    );
  }

  if (!authorized) {
    return (
      <Card className="space-y-3 p-10 text-center">
        <h2 className="font-display text-xl uppercase">Acesso restrito</h2>
        <p className="text-sm text-muted-foreground">Apenas o proprietário do complexo pode editar este campo.</p>
        <Button asChild variant="outline">
          <Link to="/campo/$id" params={{ id: sf.id }}>Ver detalhes</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/campo/$id" params={{ id: sf.id }}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
        </Button>
        <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Salvar
        </Button>
      </div>

      <Card className="space-y-4 border-border bg-card p-5">
        <div>
          <Label>Nome do campo</Label>
          <Input value={sf.name} onChange={(e) => setSf({ ...sf, name: e.target.value })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-primary" /> Preço base (R$/hora)
            </Label>
            <Input
              type="number" min={0} step="0.01"
              value={sf.price_per_hour}
              onChange={(e) => setSf({ ...sf, price_per_hour: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-surface px-4">
            <div className="flex items-center gap-2">
              <Power className={cn("h-4 w-4", sf.active ? "text-emerald-500" : "text-amber-500")} />
              <div>
                <div className="text-sm font-semibold">{sf.active ? "Ativo" : "Inativo"}</div>
                <div className="text-[11px] text-muted-foreground">
                  {sf.active ? "Recebe reservas." : "Oculto nas buscas."}
                </div>
              </div>
            </div>
            <Switch checked={sf.active} onCheckedChange={(v) => setSf({ ...sf, active: v })} />
          </div>
        </div>
      </Card>

      <Card className="space-y-4 border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg uppercase tracking-wide">Disponibilidade</h2>
        </div>

        <div>
          <Label className="mb-2 block">Dias da semana</Label>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d) => {
              const on = sf.available_days.includes(d.id);
              return (
                <button
                  key={d.id} type="button" onClick={() => toggleDay(d.id)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition",
                    on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
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
              const on = sf.available_times.includes(t);
              return (
                <button
                  key={t} type="button" onClick={() => toggleTime(t)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 font-mono text-xs transition",
                    on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Selecione os horários em que este campo aceita reservas.
          </p>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
