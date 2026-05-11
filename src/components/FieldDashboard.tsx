import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  MapPin,
  Phone,
  Plus,
  Edit,
  Share2,
  Lock,
  CheckCircle2,
  DollarSign,
  Clock,
  Sparkles,
  Trophy,
  Inbox,
  Calendar,
  Settings,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { frameClass, type UserProfile } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { computeFieldAchievements, type FieldStats } from "@/lib/fieldAchievements";
import { toast } from "sonner";

type Venue = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  bio: string | null;
  photo_url: string | null;
  verified?: boolean | null;
};
type SubField = {
  id: string;
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

export function FieldDashboard({ profile }: { profile: UserProfile }) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [subFields, setSubFields] = useState<SubField[]>([]);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingsPending, setBookingsPending] = useState(0);
  const [bookingsConfirmed, setBookingsConfirmed] = useState(0);
  const [saturdayConfirmed, setSaturdayConfirmed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: vs } = await supabase
        .from("venues" as never)
        .select("*")
        .eq("owner_user_id", profile.user_id)
        .order("created_at")
        .limit(1);
      const v = (vs as Venue[] | null)?.[0] ?? null;
      if (cancel) return;
      setVenue(v);
      if (v) {
        const { data: sfs } = await supabase
          .from("sub_fields" as never)
          .select("*")
          .eq("venue_id", v.id)
          .order("created_at");
        if (cancel) return;
        const list = (sfs as SubField[] | null) ?? [];
        setSubFields(list);

        const ids = list.map((s) => s.id);
        if (ids.length) {
          const { data: bks } = await supabase
            .from("bookings" as never)
            .select("id,status,scheduled_at")
            .in("sub_field_id", ids);
          const arr =
            (bks as { id: string; status: string; scheduled_at: string }[] | null) ?? [];
          if (cancel) return;
          setBookingsTotal(arr.length);
          setBookingsPending(arr.filter((b) => b.status === "pending").length);
          const confirmed = arr.filter((b) => b.status === "confirmed");
          setBookingsConfirmed(confirmed.length);
          setSaturdayConfirmed(
            confirmed.filter((b) => new Date(b.scheduled_at).getDay() === 6).length,
          );
        }
      }
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [profile.user_id]);

  const cheapest = useMemo(() => {
    const prices = subFields.map((s) => Number(s.price_per_hour) || 0).filter((p) => p > 0);
    return prices.length ? Math.min(...prices) : 0;
  }, [subFields]);

  const stats: FieldStats = useMemo(() => {
    const days = new Set<string>();
    let saturdaySlots = 0;
    for (const sf of subFields) {
      for (const d of sf.available_days ?? []) days.add(d);
      if ((sf.available_days ?? []).includes("sat")) {
        saturdaySlots += (sf.available_times ?? []).length;
      }
    }
    return {
      fieldsCount: subFields.length,
      bookingsConfirmed,
      hasPricingRule: subFields.some(
        (s) => Array.isArray(s.pricing_rules) && s.pricing_rules.length > 0,
      ),
      daysCovered: days,
      saturdaySlotsTotal: saturdaySlots,
      saturdayBookingsConfirmed: saturdayConfirmed,
      verified: !!venue?.verified,
      hasFiveStarReview: false,
    };
  }, [subFields, bookingsConfirmed, saturdayConfirmed, venue]);

  const achievements = useMemo(() => computeFieldAchievements(stats), [stats]);
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const total = achievements.length;

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${venue?.name ?? profile.name} — PeladaPro`, url });
      } catch {
        /* */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    }
  };

  return (
    <div className="space-y-6 py-2">
      {/* Hero */}
      <Card className="overflow-hidden border-border bg-card">
        <div
          className="relative h-44 w-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent sm:h-56"
          style={
            venue?.photo_url
              ? { backgroundImage: `url(${venue.photo_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        </div>
        <div className="-mt-14 flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div
              className={cn(
                "flex h-24 w-24 items-center justify-center rounded-2xl text-5xl shadow-glow",
                frameClass(profile.frame),
              )}
              style={{ background: profile.color + "22", color: profile.color }}
            >
              {profile.avatar ?? "🏟️"}
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-wider">Estabelecimento</span>
              </div>
              <h1 className="font-display text-3xl uppercase tracking-wider sm:text-4xl">
                {venue?.name ?? profile.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {venue?.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {venue.city}
                  </span>
                )}
                {venue?.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {venue.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={share}>
              <Share2 className="mr-1 h-4 w-4" /> Compartilhar
            </Button>
            <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground">
              <Link to="/complexo">
                <Plus className="mr-1 h-4 w-4" /> Adicionar campos
              </Link>
            </Button>
          </div>
        </div>
        {venue?.bio && (
          <p className="border-t border-border bg-surface/40 px-5 py-3 text-sm text-muted-foreground">
            {venue.bio}
          </p>
        )}
      </Card>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard icon={Building2} label="Campos" value={subFields.length.toString()} />
        <StatCard icon={DollarSign} label="A partir de" value={cheapest ? `R$ ${cheapest.toFixed(0)}/h` : "—"} />
        <StatCard icon={Calendar} label="Reservas" value={bookingsTotal.toString()} />
        <StatCard
          icon={Inbox}
          label="Pendentes"
          value={bookingsPending.toString()}
          highlight={bookingsPending > 0}
        />
      </div>

      {/* Campos */}
      <Card className="border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Campos do complexo
            </div>
            <h2 className="font-display text-xl uppercase tracking-wide">
              {subFields.length} campo{subFields.length === 1 ? "" : "s"}
            </h2>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/complexo">
              <Edit className="mr-1 h-4 w-4" /> Gerenciar
            </Link>
          </Button>
        </div>

        {loading ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Carregando…
          </p>
        ) : subFields.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Nenhum campo cadastrado ainda.</p>
            <Button asChild className="mt-3 bg-gradient-primary text-primary-foreground">
              <Link to="/complexo">
                <Plus className="mr-1 h-4 w-4" /> Adicionar campos
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subFields.map((sf) => (
              <div
                key={sf.id}
                className="overflow-hidden rounded-lg border border-border bg-surface"
              >
                <div
                  className="aspect-video w-full bg-muted"
                  style={
                    sf.photo_url
                      ? { backgroundImage: `url(${sf.photo_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : undefined
                  }
                />
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-display text-base uppercase tracking-wide">{sf.name}</div>
                    <Badge variant="outline" className="border-primary/40 text-primary">
                      {TYPE_LABEL[sf.field_type] ?? sf.field_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5" />
                    R$ {Number(sf.price_per_hour).toFixed(2)}/h
                    {Array.isArray(sf.pricing_rules) && sf.pricing_rules.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Sparkles className="h-3 w-3" /> dinâmico
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {sf.available_times.length} horários · {sf.available_days.length} dias
                  </div>
                  {!sf.active && (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-500">
                      Inativo
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Conquistas */}
      <Card className="border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xl uppercase tracking-wide">Conquistas</h2>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {unlocked}/{total} desbloqueadas
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FIELD_ACHIEVEMENTS.map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition",
                a.unlocked
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-surface opacity-60",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl",
                  a.unlocked ? "bg-primary/15" : "bg-muted",
                )}
              >
                {a.unlocked ? a.emoji : <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  {a.title}
                  {a.unlocked && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn(
        "flex items-center gap-3 border-border bg-card p-4",
        highlight && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="font-display text-lg">{value}</div>
      </div>
    </Card>
  );
}
