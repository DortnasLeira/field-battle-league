import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  DollarSign,
  Clock,
  Sparkles,
  Loader2,
  Edit,
  Share2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/complexo/$id")({
  head: () => ({
    meta: [
      { title: "Perfil do Estabelecimento — PeladaPro" },
      { name: "description", content: "Conheça os campos disponíveis no estabelecimento." },
    ],
  }),
  component: PublicVenueProfilePage,
});

type Venue = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  bio: string | null;
  photo_url: string | null;
  owner_user_id: string;
};

type OwnerProfile = {
  photo_url: string | null;
  cover_url: string | null;
  gallery: string[] | null;
};

type SubField = {
  id: string;
  venue_id: string;
  name: string;
  field_type: string;
  price_per_hour: number;
  available_days: string[];
  available_times: string[];
  pricing_rules: unknown[];
  photo_url: string | null;
  active: boolean;
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

function PublicVenueProfilePage() {
  const { id } = Route.useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [subFields, setSubFields] = useState<SubField[]>([]);
  const [loading, setLoading] = useState(true);

  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      // Busca o estabelecimento
      const { data: v } = await supabase
        .from("venues")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancel) return;
      const venue = (v as Venue | null) ?? null;
      setVenue(venue);

      if (venue) {
        const [{ data: sfs }, { data: op }] = await Promise.all([
          supabase
            .from("sub_fields")
            .select("*")
            .eq("venue_id", venue.id)
            .eq("active", true)
            .order("name"),
          supabase
            .from("user_profiles")
            .select("photo_url,cover_url,gallery")
            .eq("user_id", venue.owner_user_id)
            .eq("type", "field")
            .maybeSingle(),
        ]);
        if (!cancel) {
          setSubFields((sfs as SubField[] | null) ?? []);
          setOwnerProfile((op as OwnerProfile | null) ?? null);
        }
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [id]);

  const isOwner = useMemo(
    () => !!(session?.user && venue && venue.owner_user_id === session.user.id),
    [session, venue],
  );

  const cheapest = useMemo(() => {
    const prices = subFields.map((s) => Number(s.price_per_hour) || 0).filter((p) => p > 0);
    return prices.length ? Math.min(...prices) : 0;
  }, [subFields]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${venue?.name ?? "Estabelecimento"} — PeladaPro`, url });
      } catch {
        /* */
      }
    } else {
      await navigator.clipboard.writeText(url);
      // toast.success("Link copiado.");
    }
  };

  if (loading) {
    return (
      <Card className="flex items-center justify-center p-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
      </Card>
    );
  }

  if (!venue) {
    return (
      <Card className="space-y-3 p-10 text-center">
        <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="font-display text-xl uppercase">Estabelecimento não encontrado</h2>
        <Button onClick={() => navigate({ to: "/campos" })} variant="outline">
          Voltar para campos
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/campos"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
        </Button>
        <div className="flex gap-2">
          <Button onClick={share} variant="outline" size="sm">
            <Share2 className="mr-1 h-4 w-4" /> Compartilhar
          </Button>
          {isOwner && (
            <Button asChild size="sm" variant="outline">
              <Link to="/complexo/editar">
                <Edit className="mr-1 h-4 w-4" /> Editar
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <Card className="overflow-hidden border-border bg-card">
        <div
          className="relative h-56 w-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent sm:h-72"
          style={
            ownerProfile?.cover_url || venue.photo_url
              ? { backgroundImage: `url(${ownerProfile?.cover_url || venue.photo_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-card/10" />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5">
            {ownerProfile?.photo_url && (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-glow ring-2 ring-card/80 sm:h-24 sm:w-24">
                <img src={ownerProfile.photo_url} alt={venue.name} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-2 text-foreground/80">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-wider">Estabelecimento</span>
              </div>
              <h1 className="font-display text-2xl uppercase tracking-wider text-foreground sm:text-4xl">
                {venue.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-foreground/85">
                {venue.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {venue.city}
                  </span>
                )}
                {venue.address && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {venue.address}
                  </span>
                )}
                {venue.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {venue.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {venue.bio && (
          <p className="border-t border-border bg-surface/40 px-5 py-3 text-sm text-muted-foreground">
            {venue.bio}
          </p>
        )}
      </Card>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Building2} label="Campos" value={subFields.length.toString()} />
        <StatCard icon={DollarSign} label="A partir de" value={cheapest ? `R$ ${cheapest.toFixed(0)}/h` : "—"} />
        <StatCard
          icon={Clock}
          label="Horários"
          value={subFields.length > 0 ? "Variável" : "—"}
        />
      </div>

      {/* Galeria */}
      {ownerProfile?.gallery && ownerProfile.gallery.length > 0 && (
        <Card className="border-border bg-card p-5">
          <div className="mb-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Galeria
            </div>
            <h2 className="font-display text-xl uppercase tracking-wide">
              {ownerProfile.gallery.length} foto{ownerProfile.gallery.length === 1 ? "" : "s"}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {ownerProfile.gallery.map((url, i) => (
              <a
                key={url + i}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
              >
                <img
                  src={url}
                  alt={`Foto ${i + 1}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Campos */}
      <Card className="border-border bg-card p-5">
        <div className="mb-3">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Campos disponíveis
          </div>
          <h2 className="font-display text-xl uppercase tracking-wide">
            {subFields.length} campo{subFields.length === 1 ? "" : "s"}
          </h2>
        </div>

        {subFields.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Nenhum campo cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {subFields.map((sf) => (
              <Link
                key={sf.id}
                to="/campo/$id"
                params={{ id: sf.id }}
                className="overflow-hidden rounded-lg border border-border bg-surface transition hover:border-primary/40 hover:shadow-glow"
              >
                <div
                  className="aspect-[16/7] w-full bg-muted"
                  style={
                    sf.photo_url
                      ? { backgroundImage: `url(${sf.photo_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : undefined
                  }
                />
                <div className="space-y-1 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-display text-sm uppercase tracking-wide truncate">{sf.name}</div>
                    <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                      {TYPE_LABEL[sf.field_type] ?? sf.field_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    R$ {Number(sf.price_per_hour).toFixed(2)}/h
                    {Array.isArray(sf.pricing_rules) && sf.pricing_rules.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Sparkles className="h-2.5 w-2.5" /> dinâmico
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {sf.available_times.length} hor. · {sf.available_days.length} dias
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* CTA para reservar */}
      {subFields.length > 0 && (
        <div className="flex justify-center">
          <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground">
            <Link to="/campos">Alugar um campo</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="font-display text-lg uppercase tracking-wide text-foreground">
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
}
