import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Clock,
  DollarSign,
  Edit,
  MapPin,
  Sparkles,
  CheckCircle2,
  XCircle,
  Calendar,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { describeRule, type PricingRule } from "@/lib/pricing";

export const Route = createFileRoute("/campo/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do campo — PeladaPro" },
      { name: "description", content: "Veja preço, horários, regras de horário nobre e status do campo." },
    ],
  }),
  component: FieldDetailsPage,
});

type SubField = {
  id: string;
  venue_id: string;
  name: string;
  field_type: string;
  price_per_hour: number;
  available_days: string[];
  available_times: string[];
  pricing_rules: PricingRule[];
  photo_url: string | null;
  active: boolean;
};
type Venue = {
  id: string;
  owner_user_id: string;
  name: string;
  city: string | null;
  address: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  society: "Society",
  areia: "Areia",
  sintetico: "Sintético",
  salao: "Salão",
};
const DAY_LABEL: Record<string, string> = {
  mon: "Seg", tue: "Ter", wed: "Qua", thu: "Qui", fri: "Sex", sat: "Sáb", sun: "Dom",
};

function FieldDetailsPage() {
  const { id } = Route.useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [sf, setSf] = useState<SubField | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: f } = await supabase.from("sub_fields" as never).select("*").eq("id", id).maybeSingle();
      if (cancel) return;
      const field = (f as SubField | null) ?? null;
      setSf(field);
      if (field?.venue_id) {
        const { data: v } = await supabase.from("venues" as never).select("*").eq("id", field.venue_id).maybeSingle();
        if (!cancel) setVenue((v as Venue | null) ?? null);
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [id]);

  const isOwner = useMemo(
    () => !!(session?.user && venue && venue.owner_user_id === session.user.id),
    [session, venue],
  );

  if (loading) {
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
        <Button onClick={() => navigate({ to: "/campos" })} variant="outline">Voltar</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/campos"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
        </Button>
        {isOwner && (
          <Button asChild size="sm" variant="outline">
            <Link to="/campo/$id/editar" params={{ id: sf.id }}>
              <Edit className="mr-1 h-4 w-4" /> Editar campo
            </Link>
          </Button>
        )}
      </div>

      <Card className="overflow-hidden border-border bg-card">
        <div
          className="relative h-56 w-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent sm:h-72"
          style={
            sf.photo_url
              ? { backgroundImage: `url(${sf.photo_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
          <div className="absolute bottom-3 right-3">
            {sf.active ? (
              <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-500">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Ativo
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/40 text-amber-500">
                <XCircle className="mr-1 h-3 w-3" /> Inativo
              </Badge>
            )}
          </div>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl uppercase tracking-wider">{sf.name}</h1>
            <Badge variant="outline" className="border-primary/40 text-primary">
              {TYPE_LABEL[sf.field_type] ?? sf.field_type}
            </Badge>
          </div>
          {venue && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-4 w-4 text-primary" /> {venue.name}
              </span>
              {(venue.city || venue.address) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {[venue.address, venue.city].filter(Boolean).join(" — ")}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Preço */}
        <Card className="space-y-3 border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-wider">Preço base</span>
          </div>
          <div className="font-display text-3xl text-foreground">
            R$ {Number(sf.price_per_hour).toFixed(2)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/hora</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Este é o valor padrão por hora. Regras de horário nobre podem alterar o preço final.
          </p>
        </Card>

        {/* Status */}
        <Card className="space-y-3 border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-wider">Status</span>
          </div>
          <div className="flex items-center gap-2 font-display text-2xl uppercase">
            {sf.active ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                <span className="text-emerald-500">Ativo</span>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-amber-500" />
                <span className="text-amber-500">Inativo</span>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {sf.active
              ? "Este campo aparece nas buscas e está aberto para reservas."
              : "Este campo está oculto para clientes e não recebe reservas."}
          </p>
        </Card>
      </div>

      {/* Disponibilidade */}
      <Card className="space-y-4 border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl uppercase tracking-wide">Disponibilidade</h2>
        </div>

        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Dias da semana
          </div>
          {sf.available_days.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum dia configurado.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(DAY_LABEL).map((d) => {
                const on = sf.available_days.includes(d);
                return (
                  <span
                    key={d}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-wider",
                      on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground/50",
                    )}
                  >
                    {DAY_LABEL[d]}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" /> Horários (slots de 1h)
          </div>
          {sf.available_times.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum horário configurado.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {sf.available_times.map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-mono text-primary"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Regras de horário nobre */}
      <Card className="space-y-3 border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl uppercase tracking-wide">Regras de horário nobre</h2>
        </div>
        {!sf.pricing_rules || sf.pricing_rules.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Nenhuma regra dinâmica configurada — sempre cobra o preço base.
          </p>
        ) : (
          <ul className="space-y-2">
            {sf.pricing_rules.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface p-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{r.name || "Horário nobre"}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {(r.days ?? []).map((d) => DAY_LABEL[d] ?? d).join(" · ") || "—"} · {r.start} às {r.end}
                  </div>
                </div>
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {r.mode === "fixed"
                    ? `R$ ${Number(r.value).toFixed(2)}`
                    : `+${Number(r.value)}%`}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {sf.pricing_rules?.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Quando há regra ativa: <strong className="text-foreground">{describeRule(sf.pricing_rules[0])}</strong>
          </p>
        )}
      </Card>
    </div>
  );
}
