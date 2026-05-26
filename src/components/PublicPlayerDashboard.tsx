import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Trophy, Users, Calendar, MapPin, Star, Activity, Footprints,
  Lock, CheckCircle2, History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { frameClass, PROFILE_TYPE_EMOJI, type UserProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";

type TeamRow = {
  id: string;
  name: string;
  shield: string | null;
  city: string | null;
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

type PlayerExtras = UserProfile & {
  age?: number | null;
  gender?: string | null;
  preferred_foot?: string | null;
  field_types?: string[] | null;
  photo_url?: string | null;
};

export function PublicPlayerDashboard({ profile, isVisitor = false }: { profile: UserProfile; isVisitor?: boolean }) {
  const p = profile as PlayerExtras;
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [teamsById, setTeamsById] = useState<Record<string, TeamRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      // Times do jogador via team_members
      const { data: memberships } = await supabase
        .from("team_members")
        .select("team_id, role")
        .eq("user_id", profile.user_id);
      const teamIds = (memberships ?? []).map((m) => m.team_id as string);

      let myTeams: TeamRow[] = [];
      let allTeamsMap: Record<string, TeamRow> = {};
      let ms: MatchRow[] = [];

      if (teamIds.length) {
        const { data: ts } = await supabase
          .from("teams")
          .select("id, name, shield, city")
          .in("id", teamIds);
        myTeams = (ts ?? []) as TeamRow[];

        const orFilter = teamIds
          .map((id) => `home_team_id.eq.${id},away_team_id.eq.${id}`)
          .join(",");
        const { data: matchData } = await supabase
          .from("matches")
          .select("id, home_team_id, away_team_id, home_score, away_score, status, scheduled_at, played_at, location")
          .or(orFilter)
          .order("scheduled_at", { ascending: false });
        ms = (matchData ?? []) as MatchRow[];

        const idsForLookup = new Set<string>(teamIds);
        ms.forEach((m) => {
          if (m.home_team_id) idsForLookup.add(m.home_team_id);
          if (m.away_team_id) idsForLookup.add(m.away_team_id);
        });
        const { data: lookup } = await supabase
          .from("teams")
          .select("id, name, shield, city")
          .in("id", Array.from(idsForLookup));
        (lookup ?? []).forEach((t) => (allTeamsMap[(t as TeamRow).id] = t as TeamRow));
      }

      if (!active) return;
      setTeams(myTeams);
      setTeamsById(allTeamsMap);
      setMatches(ms);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [profile.user_id]);

  const completed = useMemo(
    () => matches.filter((m) => m.status === "completed" && m.home_score != null && m.away_score != null),
    [matches],
  );
  const upcoming = useMemo(
    () => matches.filter((m) => m.status === "scheduled" || m.status === "awaiting_score").slice(0, 4),
    [matches],
  );
  const teamIdSet = useMemo(() => new Set(teams.map((t) => t.id)), [teams]);

  const stats = useMemo(() => {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    completed.forEach((m) => {
      const isHome = m.home_team_id && teamIdSet.has(m.home_team_id);
      const my = isHome ? m.home_score! : m.away_score!;
      const opp = isHome ? m.away_score! : m.home_score!;
      gf += my; ga += opp;
      if (my > opp) w++; else if (my < opp) l++; else d++;
    });
    const j = completed.length;
    const pct = j ? Math.round(((w * 3 + d) / (j * 3)) * 100) : 0;
    return { jogos: j, w, d, l, gf, ga, sg: gf - ga, pct };
  }, [completed, teamIdSet]);

  const achievements = useMemo(() => [
    { id: "first_match", title: "O nascimento de uma lenda", description: "Jogue sua primeira partida", emoji: "🌱", unlocked: stats.jogos >= 1 },
    { id: "ten_matches", title: "A lenda continua", description: "Jogue 10 partidas", emoji: "🔥", unlocked: stats.jogos >= 10 },
    { id: "hundred_matches", title: "Lenda das lendas", description: "Jogue 100 partidas", emoji: "👑", unlocked: stats.jogos >= 100 },
    { id: "first_win", title: "Sabor da vitória", description: "Vença sua primeira partida", emoji: "🏆", unlocked: stats.w >= 1 },
    { id: "five_wins", title: "Em ritmo", description: "Acumule 5 vitórias", emoji: "⚡", unlocked: stats.w >= 5 },
    { id: "positive_sg", title: "Saldo positivo", description: "Saldo de gols positivo nas partidas", emoji: "📈", unlocked: stats.sg > 0 },
    { id: "team_player", title: "Espírito de time", description: "Faça parte de um time", emoji: "🤝", unlocked: teams.length >= 1 },
    { id: "veteran", title: "Veterano", description: "Faça parte de 2+ times", emoji: "🎖️", unlocked: teams.length >= 2 },
  ], [stats, teams]);

  const unlocked = achievements.filter((a) => a.unlocked).length;
  const total = achievements.length;
  const initials = profile.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6" data-testid="player-profile" data-visitor={isVisitor ? "true" : "false"}>
      <Card className="border-border bg-gradient-hero p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div
            className={cn(
              "relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-4xl",
              frameClass(profile.frame),
            )}
            style={{ background: profile.color + "22", color: profile.color }}
          >
            {p.photo_url ? (
              <img src={p.photo_url} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display">{initials || profile.avatar || "⚽"}</span>
            )}
            <span
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-sm shadow-glow"
              title="Jogador"
            >
              {PROFILE_TYPE_EMOJI.player}
            </span>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                <Footprints className="mr-1 h-3 w-3" /> Jogador
              </Badge>
              <Badge variant="outline" className="border-border">
                <Trophy className="mr-1 h-3 w-3 text-primary" /> {unlocked}/{total} conquistas
              </Badge>
            </div>

            <h1 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">{profile.name}</h1>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <InfoPill label="Idade" value={p.age ? `${p.age}` : "—"} />
              <InfoPill label="Cidade" value={profile.city || "—"} />
              <InfoPill label="Gênero" value={p.gender || "—"} />
              <InfoPill label="Pé" value={p.preferred_foot || "—"} />
              <InfoPill label="Campos" value={p.field_types?.length ? p.field_types.join(", ") : "—"} />
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Estatísticas
        </h2>
        <p className="text-xs text-muted-foreground">Histórico geral</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatBox label="Jogos" value={stats.jogos} />
          <StatBox label="Vitórias" value={stats.w} accent />
          <StatBox label="Empates" value={stats.d} />
          <StatBox label="Derrotas" value={stats.l} />
          <StatBox label="Aprov." value={`${stats.pct}%`} />
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" /> Conquistas
        </h2>
        <p className="text-xs text-muted-foreground">{unlocked} de {total} desbloqueadas</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition",
                a.unlocked ? "border-primary/30 bg-primary/5" : "border-dashed border-border bg-surface/40 opacity-70",
              )}
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl", a.unlocked ? "bg-primary/15" : "bg-muted")}>
                {a.unlocked ? a.emoji : <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  {a.title}
                  {a.unlocked && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                </div>
                <div className="text-[11px] text-muted-foreground">{a.description}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Times
        </h2>
        <p className="text-xs text-muted-foreground">{teams.length} time(s)</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {teams.map((t) => (
            <Link
              key={t.id}
              to="/time/$id"
              params={{ id: t.id }}
              className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition hover:border-primary/40"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-md bg-surface-elevated text-3xl ring-1 ring-border">
                {t.shield || "🛡️"}
              </div>
              <div className="flex-1">
                <div className="font-display text-base uppercase tracking-wide">{t.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t.city || "—"}
                </div>
              </div>
            </Link>
          ))}
          {teams.length === 0 && (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum time vinculado.
            </p>
          )}
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Histórico de jogos
        </h2>
        <p className="text-xs text-muted-foreground">Últimas partidas disputadas</p>
        <div className="mt-4 space-y-2">
          {loading && <EmptyLine text="Carregando..." />}
          {!loading && completed.length === 0 && <EmptyLine text="Sem partidas registradas." />}
          {completed.slice(0, 6).map((m) => {
            const isHome = m.home_team_id && teamIdSet.has(m.home_team_id);
            const my = isHome ? m.home_score! : m.away_score!;
            const opp = isHome ? m.away_score! : m.home_score!;
            const result = my > opp ? "V" : my < opp ? "D" : "E";
            const resultColor = result === "V" ? "bg-emerald-500/15 text-emerald-500" : result === "D" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground";
            const homeT = m.home_team_id ? teamsById[m.home_team_id] : null;
            const awayT = m.away_team_id ? teamsById[m.away_team_id] : null;
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-md font-display text-sm font-bold", resultColor)}>
                  {result}
                </div>
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

      {!isVisitor && (
        <Card data-testid="player-upcoming-games" className="border-border bg-card p-6">
          <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Próximos jogos
          </h2>
          <div className="mt-4 space-y-3">
            {!loading && upcoming.length === 0 && <EmptyLine text="Nenhum jogo confirmado." />}
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
      )}

      <p className="text-center text-xs text-muted-foreground">
        <Link to="/buscar" className="underline">← Voltar para a busca</Link>
      </p>
    </div>
  );
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
      <div className={cn("stat-num mt-1 text-2xl font-bold", accent ? "text-gradient-primary" : "text-foreground")}>
        {value}
      </div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</p>
  );
}
