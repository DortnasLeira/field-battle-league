import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trophy, Calendar, MapPin, Star, History, Shield, Users, BadgeCheck, Settings, Pencil, Lock, TrendingUp, HeartHandshake } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type TeamRow = {
  id: string;
  name: string;
  shield: string | null;
  city: string | null;
  captain: string | null;
  founded: number | null;
  preferred_days: string[] | null;
  preferred_times: string[] | null;
  verified?: boolean | null;
  rating?: number | null;
  fair_play?: number | null;
};

type TrophyRow = {
  id: string;
  title: string;
  kind: string;
  season: string | null;
  icon: string | null;
  awarded_at: string;
};

type MatchRow = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  scheduled_at: string | null;
  played_at: string | null;
  location: string | null;
};

export function PublicTeamDashboard({ team }: { team: TeamRow }) {
  const { session } = useAuth();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [teamsById, setTeamsById] = useState<Record<string, TeamRow>>({});
  const [trophies, setTrophies] = useState<TrophyRow[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const matchesPromise = supabase
        .from("matches")
        .select("id, home_team_id, away_team_id, home_score, away_score, status, scheduled_at, played_at, location")
        .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
        .order("scheduled_at", { ascending: false });

      const trophiesPromise = supabase
        .from("team_trophies")
        .select("id, title, kind, season, icon, awarded_at")
        .eq("team_id", team.id)
        .order("awarded_at", { ascending: false });

      const ownerPromise = session
        ? supabase
            .from("team_members")
            .select("role")
            .eq("team_id", team.id)
            .eq("user_id", session.user.id)
            .eq("role", "owner")
            .maybeSingle()
        : Promise.resolve({ data: null });

      const [{ data: ms }, { data: tr }, { data: own }] = await Promise.all([
        matchesPromise,
        trophiesPromise,
        ownerPromise,
      ]);
      const list = (ms ?? []) as MatchRow[];

      const ids = new Set<string>();
      list.forEach((m) => {
        if (m.home_team_id) ids.add(m.home_team_id);
        if (m.away_team_id) ids.add(m.away_team_id);
      });
      ids.add(team.id);

      const { data: ts } = await supabase
        .from("teams")
        .select("id, name, shield, city, captain, founded, preferred_days, preferred_times, verified, rating, fair_play")
        .in("id", Array.from(ids));
      const map: Record<string, TeamRow> = {};
      (ts ?? []).forEach((t) => (map[(t as TeamRow).id] = t as TeamRow));

      if (!active) return;
      setMatches(list);
      setTeamsById(map);
      setTrophies((tr ?? []) as TrophyRow[]);
      setIsOwner(!!own);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [team.id, session]);

  const completed = useMemo(
    () => matches.filter((m) => m.status === "completed" && m.home_score != null && m.away_score != null),
    [matches],
  );
  const upcoming = useMemo(
    () => matches.filter((m) => m.status === "scheduled" || m.status === "awaiting_score").slice(0, 4),
    [matches],
  );

  const stats = useMemo(() => {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    completed.forEach((m) => {
      const home = m.home_team_id === team.id;
      const my = home ? m.home_score! : m.away_score!;
      const opp = home ? m.away_score! : m.home_score!;
      gf += my; ga += opp;
      if (my > opp) w++; else if (my < opp) l++; else d++;
    });
    const j = completed.length;
    const pct = j ? Math.round(((w * 3 + d) / (j * 3)) * 100) : 0;
    return { j, w, d, l, gf, ga, sg: gf - ga, pct };
  }, [completed, team.id]);

  return (
    <div className="space-y-6">
      <Card className="border-border bg-gradient-hero p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-surface text-5xl ring-2 ring-border">
            {team.shield || "🛡️"}
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                <Shield className="mr-1 h-3 w-3" /> Time
              </Badge>
              {team.verified && (
                <Badge className="bg-gradient-to-r from-primary to-primary/70 text-background">
                  <BadgeCheck className="mr-1 h-3 w-3" /> Time PRO
                </Badge>
              )}
              {team.founded && (
                <Badge variant="outline" className="border-border">
                  <Star className="mr-1 h-3 w-3 text-primary" /> Desde {team.founded}
                </Badge>
              )}
            </div>
            <h1 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">{team.name}</h1>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <InfoPill label="Cidade" value={team.city || "—"} />
              <InfoPill label="Capitão" value={team.captain || "—"} />
              <InfoPill label="Dias" value={team.preferred_days?.join(", ") || "—"} />
              <InfoPill label="Horários" value={team.preferred_times?.join(", ") || "—"} />
            </div>
          </div>
        </div>
      </Card>

      {isOwner && (
        <Card className="border-primary/30 bg-primary/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-sm uppercase tracking-wide">Dashboard de gestão</div>
                <p className="text-xs text-muted-foreground">Visível somente para o dono. Edite informações e privacidade.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="border-primary/40">
                <Link to="/perfil/editar"><Pencil className="mr-1 h-4 w-4" /> Editar informações</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-border">
                <Link to="/perfil"><Lock className="mr-1 h-4 w-4" /> Privacidade</Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Painel de status
        </h2>
        <p className="text-xs text-muted-foreground">Score Elo do time e fair play coletivo.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="Rating Elo" value={Math.round(Number(team.rating ?? 1500))} accent />
          <StatBox label="Tier" value={ratingTier(Number(team.rating ?? 1500))} />
          <StatBox label="Fair Play" value={`${Math.round(Number(team.fair_play ?? 100))}%`} />
          <StatBox label="Verificado" value={team.verified ? "Sim" : "Não"} />
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <HeartHandshake className="h-3.5 w-3.5" /> Elo recalculado automaticamente após cada súmula assinada.
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" /> Vitrine de troféus
        </h2>
        <p className="text-xs text-muted-foreground">Conquistas coletivas (ligas, desafios e copas).</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {trophies.length === 0 && (
            <div className="col-span-full rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum troféu ainda. As conquistas aparecem aqui após ligas e desafios oficiais.
            </div>
          )}
          {trophies.map((t) => (
            <div key={t.id} className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="text-2xl">{t.icon || "🏆"}</div>
              <div className="mt-1 text-sm font-semibold">{t.title}</div>
              <div className="text-[11px] text-muted-foreground">
                {t.kind === "league" ? "Liga" : t.kind === "challenge" ? "Desafio" : t.kind === "cup" ? "Copa" : "Conquista"}
                {t.season ? ` · ${t.season}` : ""}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" /> Estatísticas
        </h2>
        <p className="text-xs text-muted-foreground">Histórico geral</p>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <StatBox label="Jogos" value={stats.j} />
          <StatBox label="V" value={stats.w} accent />
          <StatBox label="E" value={stats.d} />
          <StatBox label="D" value={stats.l} />
          <StatBox label="GP" value={stats.gf} />
          <StatBox label="GC" value={stats.ga} />
          <StatBox label="SG" value={stats.sg > 0 ? `+${stats.sg}` : stats.sg} />
          <StatBox label="Aprov." value={`${stats.pct}%`} />
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Conquistas
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {computeTeamAchievements(stats).map((a) => (
            <div key={a.id} className={cn(
              "flex items-start gap-3 rounded-lg border p-3 transition",
              a.unlocked ? "border-primary/30 bg-primary/5" : "border-dashed border-border bg-surface/40 opacity-70",
            )}>
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl", a.unlocked ? "bg-primary/15" : "bg-muted")}>{a.emoji}</div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{a.title}</div>
                <div className="text-[11px] text-muted-foreground">{a.description}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Histórico de partidas
        </h2>
        <p className="text-xs text-muted-foreground">Placares (somente leitura)</p>
        <div className="mt-4 space-y-2">
          {loading && <EmptyLine text="Carregando..." />}
          {!loading && completed.length === 0 && <EmptyLine text="Sem partidas registradas." />}
          {completed.slice(0, 8).map((m) => {
            const home = m.home_team_id === team.id;
            const my = home ? m.home_score! : m.away_score!;
            const opp = home ? m.away_score! : m.home_score!;
            const result = my > opp ? "V" : my < opp ? "D" : "E";
            const color = result === "V" ? "bg-emerald-500/15 text-emerald-500" : result === "D" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground";
            const homeT = m.home_team_id ? teamsById[m.home_team_id] : null;
            const awayT = m.away_team_id ? teamsById[m.away_team_id] : null;
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-md font-display text-sm font-bold", color)}>{result}</div>
                <div className="flex flex-1 items-center gap-2 text-sm">
                  <span className="font-semibold">{homeT?.shield} {homeT?.name ?? "—"}</span>
                  <span className="font-mono text-xs">{m.home_score} × {m.away_score}</span>
                  <span className="font-semibold">{awayT?.shield} {awayT?.name ?? "—"}</span>
                </div>
                <div className="text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {m.played_at || m.scheduled_at ? new Date((m.played_at || m.scheduled_at)!).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Próximos jogos
        </h2>
        <div className="mt-4 space-y-3">
          {!loading && upcoming.length === 0 && <EmptyLine text="Nenhum jogo agendado." />}
          {upcoming.map((m) => {
            const homeT = m.home_team_id ? teamsById[m.home_team_id] : null;
            const awayT = m.away_team_id ? teamsById[m.away_team_id] : null;
            return (
              <div key={m.id} className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold">{homeT?.shield} {homeT?.name ?? "—"}</span>
                  <span className="font-mono text-xs text-muted-foreground">VS</span>
                  <span className="font-semibold">{awayT?.shield} {awayT?.name ?? "—"}</span>
                </div>
                <div className="text-right text-xs">
                  {m.scheduled_at && (
                    <div className="font-display text-sm uppercase">
                      {new Date(m.scheduled_at).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                      {" · "}
                      {new Date(m.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                  {m.location && (
                    <div className="font-mono text-muted-foreground">
                      <MapPin className="inline h-3 w-3" /> {m.location}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        <Link to="/buscar" className="underline">← Voltar para a busca</Link>
      </p>
    </div>
  );
}

function computeTeamAchievements(s: { j: number; w: number; sg: number }) {
  return [
    { id: "first_match", title: "Primeira partida", description: "Disputou ao menos 1 partida", emoji: "🌱", unlocked: s.j >= 1 },
    { id: "ten_matches", title: "Caminhada", description: "10 partidas disputadas", emoji: "🔥", unlocked: s.j >= 10 },
    { id: "first_win", title: "Primeira vitória", description: "Venceu ao menos 1 partida", emoji: "🏆", unlocked: s.w >= 1 },
    { id: "five_wins", title: "Time vencedor", description: "5 vitórias acumuladas", emoji: "👑", unlocked: s.w >= 5 },
    { id: "positive_sg", title: "Saldo positivo", description: "Saldo de gols positivo", emoji: "📈", unlocked: s.sg > 0 },
    { id: "hundred", title: "Centenário", description: "100 partidas disputadas", emoji: "💯", unlocked: s.j >= 100 },
  ];
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface/60 p-2 backdrop-blur">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-3", accent ? "border-primary/30 bg-primary/5" : "border-border bg-surface")}>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("stat-num mt-1 text-2xl font-bold", accent ? "text-gradient-primary" : "text-foreground")}>{value}</div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</p>;
}
