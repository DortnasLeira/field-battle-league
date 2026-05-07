import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Edit, Share2, Trophy, Users, Calendar, MapPin, Star, Activity, Footprints,
  Lock, CheckCircle2, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { frameClass, PROFILE_TYPE_EMOJI, type UserProfile } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { TeamBadge } from "@/components/TeamBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PLAYER_ACHIEVEMENTS } from "@/lib/achievements";

type PlayerExtras = UserProfile & {
  age?: number | null;
  gender?: string | null;
  preferred_foot?: string | null;
  field_types?: string[] | null;
  photo_url?: string | null;
};

export function PlayerDashboard({ profile, isOwner }: { profile: UserProfile; isOwner: boolean }) {
  const p = profile as PlayerExtras;
  const navigate = useNavigate();
  const { teams, matches, currentTeamId, fields } = useStore();

  const seasons = ["2026", "2025", "2024"];
  const [season, setSeason] = useState("2026");

  const myTeams = useMemo(
    () => teams.filter((t) => t.id === currentTeamId || t.id === "t4"),
    [teams, currentTeamId],
  );

  const history = useMemo(
    () =>
      matches
        .filter(
          (m) =>
            (m.homeId === currentTeamId || m.awayId === currentTeamId) &&
            m.status === "completed",
        )
        .slice(0, 6),
    [matches, currentTeamId],
  );

  const upcoming = useMemo(
    () =>
      matches
        .filter(
          (m) =>
            (m.homeId === currentTeamId || m.awayId === currentTeamId) &&
            (m.status === "scheduled" || m.status === "awaiting_score"),
        )
        .slice(0, 4),
    [matches, currentTeamId],
  );

  const statsBySeason: Record<string, { jogos: number; gols: number; assistencias: number; defesas: number; aproveitamento: number }> = {
    "2026": { jogos: 24, gols: 11, assistencias: 7, defesas: 3, aproveitamento: 68 },
    "2025": { jogos: 38, gols: 19, assistencias: 12, defesas: 5, aproveitamento: 71 },
    "2024": { jogos: 22, gols: 8, assistencias: 4, defesas: 2, aproveitamento: 55 },
  };
  const stats = statsBySeason[season];

  const score = 7.8;
  const lastMatchDays = 12;
  const isActive = lastMatchDays <= 180;

  const unlocked = PLAYER_ACHIEVEMENTS.filter((a) => a.unlocked).length;
  const total = PLAYER_ACHIEVEMENTS.length;

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `${profile.name} — PeladaPro`, url }); } catch { /* */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link do perfil copiado!");
    }
  };

  const initials = profile.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6">
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
              <Badge variant="outline" className={cn("border-border", isActive ? "text-emerald-500" : "text-muted-foreground")}>
                <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-muted-foreground")} />
                {isActive ? "Ativo" : "Inativo"}
              </Badge>
              <Badge variant="outline" className="border-border">
                <Trophy className="mr-1 h-3 w-3 text-primary" /> {unlocked}/{total} conquistas
              </Badge>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <h1 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">{profile.name}</h1>
              <div className="flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 font-mono text-sm font-bold text-primary">
                <Star className="h-3.5 w-3.5 fill-current" /> {score.toFixed(1)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <InfoPill label="Idade" value={p.age ? `${p.age}` : "—"} />
              <InfoPill label="Cidade" value={profile.city || "—"} />
              <InfoPill label="Gênero" value={p.gender || "—"} />
              <InfoPill label="Pé" value={p.preferred_foot || "—"} />
              <InfoPill label="Campos" value={p.field_types?.length ? p.field_types.join(", ") : "—"} />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {isOwner && (
                <Button size="sm" onClick={() => navigate({ to: "/perfil" })} className="bg-gradient-primary text-primary-foreground">
                  <Edit className="mr-2 h-4 w-4" /> Editar perfil
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={share}>
                <Share2 className="mr-2 h-4 w-4" /> Compartilhar
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Estatísticas
            </h2>
            <p className="text-xs text-muted-foreground">Temporada {season}</p>
          </div>
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {seasons.map((s) => <SelectItem key={s} value={s}>Temporada {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatBox label="Jogos" value={stats.jogos} />
          <StatBox label="Gols" value={stats.gols} accent />
          <StatBox label="Assistências" value={stats.assistencias} />
          <StatBox label="Defesas" value={stats.defesas} />
          <StatBox label="Aprov." value={`${stats.aproveitamento}%`} />
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" /> Conquistas
            </h2>
            <p className="text-xs text-muted-foreground">{unlocked} de {total} desbloqueadas</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PLAYER_ACHIEVEMENTS.map((a) => (
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
        <p className="text-xs text-muted-foreground">{myTeams.length} time(s)</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {myTeams.map((t) => (
            <div key={t.id} className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-md bg-surface-elevated text-3xl ring-1 ring-border">
                {t.shield}
              </div>
              <div className="flex-1">
                <div className="font-display text-base uppercase tracking-wide">{t.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t.city} · Capitão {t.captain}
                </div>
              </div>
              <Badge variant="outline" className="border-border">{t.id === currentTeamId ? "Titular" : "Reserva"}</Badge>
            </div>
          ))}
          {myTeams.length === 0 && (
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
          {history.length === 0 && <EmptyLine text="Sem partidas registradas." />}
          {history.map((m) => {
            const home = teams.find((t) => t.id === m.homeId);
            const away = teams.find((t) => t.id === m.awayId);
            const myTeam = m.homeId === currentTeamId ? "home" : "away";
            const myScore = myTeam === "home" ? m.homeScore! : m.awayScore!;
            const oppScore = myTeam === "home" ? m.awayScore! : m.homeScore!;
            const result = myScore > oppScore ? "V" : myScore < oppScore ? "D" : "E";
            const resultColor = result === "V" ? "bg-emerald-500/15 text-emerald-500" : result === "D" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground";
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-md font-display text-sm font-bold", resultColor)}>
                  {result}
                </div>
                <div className="flex flex-1 items-center gap-2 text-sm">
                  <span className="font-semibold">{home?.shield} {home?.name}</span>
                  <span className="font-mono text-xs">{m.homeScore} × {m.awayScore}</span>
                  <span className="font-semibold">{away?.shield} {away?.name}</span>
                </div>
                <div className="text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {new Date(m.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Próximos jogos confirmados
        </h2>
        <p className="text-xs text-muted-foreground">{isOwner ? "Sua presença marcada" : "Agenda do jogador"}</p>
        <div className="mt-4 space-y-3">
          {upcoming.length === 0 && <EmptyLine text="Nenhum jogo confirmado no momento." />}
          {upcoming.map((m) => {
            const field = fields.find((f) => f.id === m.fieldId);
            const home = teams.find((t) => t.id === m.homeId)!;
            const away = teams.find((t) => t.id === m.awayId)!;
            return (
              <div key={m.id} className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <TeamBadge teamId={home.id} size="sm" />
                  <span className="font-mono text-xs text-muted-foreground">VS</span>
                  <TeamBadge teamId={away.id} size="sm" />
                </div>
                <div className="text-right text-xs">
                  <div className="font-display text-sm uppercase">
                    {new Date(m.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                    {" · "}
                    {new Date(m.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {field && (
                    <div className="font-mono text-muted-foreground">
                      <MapPin className="inline h-3 w-3" /> {field.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {!isOwner && (
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/buscar" className="underline">← Voltar para a busca</Link>
        </p>
      )}
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
