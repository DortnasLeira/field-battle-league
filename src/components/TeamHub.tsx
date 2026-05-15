import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, Swords, ClipboardCheck, Award, Trophy, MapPin, Loader2, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Booking = {
  id: string;
  field_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
};

type Challenge = {
  id: string;
  title: string;
  status: string;
  scheduled_at: string | null;
  location: string | null;
  visibility: string;
  opponent_team_id: string | null;
  created_by_team_id: string;
};

type MatchRow = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  scheduled_at: string | null;
  status: string;
  location: string | null;
};

export function TeamHub({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [fieldNames, setFieldNames] = useState<Record<string, string>>({});
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [pendingMatches, setPendingMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: bk }, { data: ch }, { data: ms }] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, field_id, scheduled_at, duration_minutes, status")
          .eq("requester_team_id", teamId)
          .gte("scheduled_at", new Date(Date.now() - 7 * 86400000).toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(8),
        supabase
          .from("challenges")
          .select("id, title, status, scheduled_at, location, visibility, opponent_team_id, created_by_team_id")
          .or(`created_by_team_id.eq.${teamId},opponent_team_id.eq.${teamId}`)
          .in("status", ["open", "pending", "accepted"])
          .order("scheduled_at", { ascending: true, nullsFirst: false })
          .limit(8),
        supabase
          .from("matches")
          .select("id, home_team_id, away_team_id, home_score, away_score, scheduled_at, status, location")
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .in("status", ["awaiting_score", "scheduled"])
          .order("scheduled_at", { ascending: false })
          .limit(8),
      ]);

      const fids = Array.from(new Set((bk ?? []).map((b: any) => b.field_id)));
      let fmap: Record<string, string> = {};
      if (fids.length) {
        const { data: fs } = await supabase.from("fields").select("id, name").in("id", fids);
        (fs ?? []).forEach((f: any) => (fmap[f.id] = f.name));
      }

      if (!alive) return;
      setBookings((bk ?? []) as Booking[]);
      setChallenges((ch ?? []) as Challenge[]);
      setPendingMatches((ms ?? []) as MatchRow[]);
      setFieldNames(fmap);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [teamId]);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Hub do Time
          </h2>
          <p className="text-xs text-muted-foreground">Centro de comando de {teamName} — reservas, desafios e súmulas em um só lugar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="border-border">
            <Link to="/arbitragem"><Award className="mr-1 h-4 w-4" /> Árbitros</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="border-border">
            <Link to="/ligas"><Trophy className="mr-1 h-4 w-4" /> Ligas</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="border-border">
            <Link to="/ranking"><Trophy className="mr-1 h-4 w-4" /> Ranking</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground">
            <Link to="/desafios">Novo desafio <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <HubColumn
            icon={<CalendarClock className="h-4 w-4 text-primary" />}
            title="Reservas de campo"
            cta={{ to: "/campos", label: "Reservar" }}
            empty="Nenhuma reserva próxima."
            items={bookings.map((b) => ({
              key: b.id,
              title: fieldNames[b.field_id] ?? "Campo",
              subtitle: `${new Date(b.scheduled_at).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · ${b.duration_minutes}min`,
              status: b.status,
            }))}
          />

          <HubColumn
            icon={<Swords className="h-4 w-4 text-primary" />}
            title="Desafios pendentes"
            cta={{ to: "/desafios", label: "Ver todos" }}
            empty="Nenhum desafio em aberto."
            items={challenges.map((c) => ({
              key: c.id,
              title: c.title,
              subtitle: c.scheduled_at
                ? `${new Date(c.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}${c.location ? ` · ${c.location}` : ""}`
                : c.location ?? (c.opponent_team_id ? "Confronto agendado" : "Aberto a interessados"),
              status: c.status,
            }))}
          />

          <HubColumn
            icon={<ClipboardCheck className="h-4 w-4 text-primary" />}
            title="Placares para validar"
            cta={{ to: "/desafios", label: "Validar" }}
            empty="Sem súmulas pendentes."
            items={pendingMatches.map((m) => {
              const home = m.home_team_id === teamId;
              const myScore = home ? m.home_score : m.away_score;
              const oppScore = home ? m.away_score : m.home_score;
              const hasScore = myScore != null && oppScore != null;
              return {
                key: m.id,
                title: hasScore ? `${myScore} × ${oppScore}` : "Aguardando placar",
                subtitle: m.scheduled_at
                  ? `${new Date(m.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}${m.location ? ` · ${m.location}` : ""}`
                  : (m.location ?? "—"),
                status: m.status,
                href: `/sumula/${m.id}`,
              };
            })}
          />
        </div>
      )}
    </Card>
  );
}

type HubItem = {
  key: string;
  title: string;
  subtitle: string;
  status: string;
  href?: string;
};

function HubColumn({
  icon,
  title,
  cta,
  empty,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  cta: { to: string; label: string };
  empty: string;
  items: HubItem[];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-display text-sm uppercase tracking-wide">{title}</span>
        </div>
        <Link to={cta.to} className="text-[11px] text-primary hover:underline">{cta.label}</Link>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const body = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{it.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {it.subtitle.includes("·") && it.subtitle.split("·").length > 1 ? (
                        <>
                          {it.subtitle.split("·")[0]?.trim()}
                          <MapPin className="mx-1 inline h-2.5 w-2.5" />
                          {it.subtitle.split("·").slice(1).join("·").trim()}
                        </>
                      ) : it.subtitle}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[9px] uppercase">{it.status}</Badge>
                </div>
              </>
            );
            return (
              <li key={it.key}>
                {it.href ? (
                  <a href={it.href} className="block rounded-md border border-border bg-background p-2.5 transition hover:border-primary/40">
                    {body}
                  </a>
                ) : (
                  <div className="rounded-md border border-border bg-background p-2.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
