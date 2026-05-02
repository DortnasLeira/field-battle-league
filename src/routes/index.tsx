import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Edit, Share2, Trophy, Users, Calendar, MapPin, Shield, Star, Goal, Target, Activity, Footprints, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth, frameClass, PROFILE_TYPE_EMOJI, PROFILE_TYPE_LABEL, type UserProfile, type ProfileType } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { TeamBadge } from "@/components/TeamBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — PeladaPro" },
      { name: "description", content: "Resumo do seu perfil de jogador, time ou campo." },
    ],
  }),
  component: PerfilHome,
});

function PerfilHome() {
  const { session, loading, activeProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/ligas" });
  }, [loading, session, navigate]);

  if (loading) return null;
  if (!session) return null;

  if (!activeProfile) {
    return (
      <Card className="border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">Crie um perfil para começar.</p>
        <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground">
          <Link to="/onboarding">Criar perfil</Link>
        </Button>
      </Card>
    );
  }

  if (activeProfile.type === "player") return <PlayerDashboard profile={activeProfile} />;
  return <PlaceholderDashboard type={activeProfile.type} />;
}

/* ========================= PLAYER ========================= */

type PlayerExtras = UserProfile & {
  age?: number | null;
  gender?: string | null;
  preferred_foot?: string | null;
  field_types?: string[] | null;
  photo_url?: string | null;
};

function PlayerDashboard({ profile }: { profile: UserProfile }) {
  const p = profile as PlayerExtras;
  const navigate = useNavigate();
  const { teams, matches, currentTeamId, fields } = useStore();

  // Mock association: jogador participa do "meu" time + 1 secundário
  const myTeams = useMemo(
    () => teams.filter((t) => t.id === currentTeamId || t.id === "t4"),
    [teams, currentTeamId],
  );

  // Mock confirmados: próximos jogos do time principal
  const upcoming = useMemo(
    () =>
      matches
        .filter(
          (m) =>
            (m.homeId === currentTeamId || m.awayId === currentTeamId) &&
            (m.status === "scheduled" || m.status === "awaiting_score"),
        )
        .slice(0, 4)
        .map((m) => ({ match: m, teamId: currentTeamId })),
    [matches, currentTeamId],
  );

  // Mock stats — em versão futura virão do banco
  const stats = { jogos: 24, gols: 11, assistencias: 7, aproveitamento: 68, mvp: 3, amarelos: 4 };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${profile.name} — PeladaPro`, url });
      } catch {
        /* ignore */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link do perfil copiado!");
    }
  };

  return (
    <div className="space-y-6">
      {/* BLOCO 1 — Informações básicas */}
      <Card className="overflow-hidden border-border bg-gradient-hero">
        <div className="field-pattern absolute inset-0 opacity-30" />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr]">
          <PlayerPhoto profile={p} onEdit={() => navigate({ to: "/perfil" })} />
          <div className="space-y-4">
            <div>
              <Badge className="mb-2 bg-primary/15 text-primary hover:bg-primary/20">
                <Footprints className="mr-1 h-3 w-3" /> Jogador
              </Badge>
              <h1 className="font-display text-3xl uppercase tracking-wide sm:text-5xl">{profile.name}</h1>
              {profile.nickname && (
                <p className="text-sm text-muted-foreground">"{profile.nickname}"</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <InfoPill label="Idade" value={p.age ? `${p.age} anos` : "—"} />
              <InfoPill label="Posição" value={profile.position || "—"} />
              <InfoPill label="Pé preferido" value={p.preferred_foot || "—"} />
              <InfoPill label="Gênero" value={p.gender || "—"} />
              <InfoPill label="Cidade" value={profile.city || "—"} />
              <InfoPill label="Nível" value={profile.level || "—"} />
            </div>

            {p.field_types && p.field_types.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Joga em:
                </span>
                {p.field_types.map((ft) => (
                  <Badge key={ft} variant="outline" className="border-primary/40 text-primary">
                    {ft}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={() => navigate({ to: "/perfil" })} className="bg-gradient-primary text-primary-foreground">
                <Edit className="mr-2 h-4 w-4" /> Editar perfil
              </Button>
              <Button variant="outline" onClick={share}>
                <Share2 className="mr-2 h-4 w-4" /> Compartilhar
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* BLOCO 2 — Estatísticas */}
      <Card className="border-border bg-card p-6">
        <SectionTitle icon={<Activity className="h-5 w-5 text-primary" />} title="Estatísticas" hint="Sua temporada em números" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatBox label="Jogos" value={stats.jogos} />
          <StatBox label="Gols" value={stats.gols} icon={<Goal className="h-3.5 w-3.5" />} accent />
          <StatBox label="Assistências" value={stats.assistencias} icon={<Target className="h-3.5 w-3.5" />} />
          <StatBox label="Aprov." value={`${stats.aproveitamento}%`} />
          <StatBox label="MVP" value={stats.mvp} icon={<Star className="h-3.5 w-3.5" />} />
          <StatBox label="Amarelos" value={stats.amarelos} />
        </div>
      </Card>

      {/* BLOCO 3 — Conquistas */}
      <Card className="border-border bg-card p-6">
        <SectionTitle icon={<Trophy className="h-5 w-5 text-primary" />} title="Conquistas" hint="Em breve" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-surface/50 p-4 text-center opacity-60">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">🏅</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">A definir</div>
            </div>
          ))}
        </div>
      </Card>

      {/* BLOCO 4 — Meus times */}
      <Card className="border-border bg-card p-6">
        <SectionTitle icon={<Users className="h-5 w-5 text-primary" />} title="Meus times" hint={`${myTeams.length} time(s)`} />
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
              Você ainda não está em nenhum time. Vá até <Link to="/vagas" className="text-primary underline">Vagas</Link> para se inscrever.
            </p>
          )}
        </div>
      </Card>

      {/* BLOCO 5 — Próximos jogos confirmados */}
      <Card className="border-border bg-card p-6">
        <SectionTitle icon={<Calendar className="h-5 w-5 text-primary" />} title="Próximos jogos confirmados" hint="Sua presença marcada" />
        <div className="mt-4 space-y-3">
          {upcoming.length === 0 && (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum jogo confirmado no momento.
            </p>
          )}
          {upcoming.map(({ match, teamId }) => {
            const field = fields.find((f) => f.id === match.fieldId);
            const team = teams.find((t) => t.id === teamId)!;
            const opponent = match.homeId === teamId ? match.awayId : match.homeId;
            return (
              <div
                key={match.id}
                className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-primary text-2xl text-primary-foreground shadow-glow">
                    {team.shield}
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
                      Você joga por
                    </div>
                    <div className="font-display text-base uppercase tracking-wide">{team.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">VS</span>
                  <TeamBadge teamId={opponent} size="sm" />
                </div>
                <div className="text-right text-xs">
                  <div className="font-display text-sm uppercase">
                    {new Date(match.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                  </div>
                  <div className="font-mono text-muted-foreground">
                    {new Date(match.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    {field && <> · <MapPin className="inline h-3 w-3" /> {field.name}</>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function PlayerPhoto({ profile, onEdit }: { profile: PlayerExtras; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const initials = profile.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl text-5xl transition hover:scale-[1.02] sm:h-40 sm:w-40",
          frameClass(profile.frame),
        )}
        style={{ background: profile.color + "22", color: profile.color }}
        aria-label="Ver foto"
      >
        {profile.photo_url ? (
          <img src={profile.photo_url} alt={profile.name} className="h-full w-full object-cover" />
        ) : (
          <span className="font-display">{initials || profile.avatar || "⚽"}</span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl overflow-hidden p-0">
          <button
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 z-10 rounded-md bg-background/80 p-1.5 backdrop-blur"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex aspect-square items-center justify-center bg-surface" style={{ background: profile.color + "11" }}>
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-[12rem]" style={{ color: profile.color }}>
                {initials || profile.avatar || "⚽"}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border p-4">
            <div>
              <div className="font-display uppercase tracking-wide">{profile.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Foto do perfil
              </div>
            </div>
            <Button onClick={onEdit} className="bg-gradient-primary text-primary-foreground">
              <Edit className="mr-2 h-4 w-4" /> Substituir foto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface/60 p-2.5 backdrop-blur">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function SectionTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-display text-xl uppercase tracking-wide">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {icon}
    </div>
  );
}

function StatBox({ label, value, icon, accent }: { label: string; value: string | number; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-3", accent ? "border-primary/30 bg-primary/5" : "border-border bg-surface")}>
      <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("stat-num mt-1 text-2xl font-bold", accent ? "text-gradient-primary" : "text-foreground")}>
        {value}
      </div>
    </div>
  );
}

/* ========================= PLACEHOLDER (Team / Field) ========================= */

function PlaceholderDashboard({ type }: { type: ProfileType }) {
  return (
    <Card className="border-dashed border-border bg-card p-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
        {PROFILE_TYPE_EMOJI[type]}
      </div>
      <h2 className="mt-4 font-display text-2xl uppercase tracking-wide">
        Perfil de {PROFILE_TYPE_LABEL[type]}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        O painel específico para {PROFILE_TYPE_LABEL[type]} será configurado em breve.
        Por enquanto, use o menu para navegar pelas demais seções.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button asChild variant="outline">
          <Link to="/perfil"><Shield className="mr-2 h-4 w-4" /> Editar perfis</Link>
        </Button>
        <Button asChild className="bg-gradient-primary text-primary-foreground">
          <Link to="/ligas"><Trophy className="mr-2 h-4 w-4" /> Ver ligas</Link>
        </Button>
      </div>
    </Card>
  );
}
