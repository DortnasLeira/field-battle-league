import { Link } from "@tanstack/react-router";
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Flag as Whistle,
  Lock,
  MapPin,
  Pencil,
  Star,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { UserProfile } from "@/lib/auth";
import { frameClass } from "@/lib/auth";
import { REFEREE_ACHIEVEMENTS } from "@/lib/refereeAchievements";
import { REFEREE_TIER_INFO, referees as mockReferees, type RefereeTier } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export function RefereeDashboard({ profile }: { profile: UserProfile }) {
  // Sobreposição com dados de referência (mock) caso o perfil ainda não tenha
  // dados business completos persistidos.
  const fallback = mockReferees[0];
  const matched = mockReferees.find(
    (r) => r.name.toLowerCase() === profile.name.toLowerCase(),
  );
  const ref = matched ?? fallback;

  const tier: RefereeTier = ref.tier;
  const tierInfo = REFEREE_TIER_INFO[tier];

  const achievements = REFEREE_ACHIEVEMENTS;
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const total = achievements.length;
  const pct = Math.round((unlocked / Math.max(1, total)) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden border-referee/40 bg-card p-6 shadow-glow-referee">
        <div className="absolute inset-0 bg-gradient-referee opacity-10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            className={cn(
              "flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-referee/15 text-5xl",
              frameClass(profile.frame),
            )}
            style={{ color: profile.color }}
          >
            {profile.avatar ?? "🟨"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Whistle className="h-4 w-4 text-referee" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-referee">
                Árbitro · Business
              </span>
            </div>
            <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
              {profile.name}
            </h1>
            {profile.nickname && (
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                "{profile.nickname}"
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {profile.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {profile.city}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-referee">
                <Star className="h-3 w-3 fill-current" />
                {ref.score.toFixed(1)}
                <span className="text-muted-foreground">
                  ({ref.reviews} avaliações)
                </span>
              </span>
              <span className="inline-flex items-center gap-1">
                <DollarSign className="h-3 w-3" />R$ {ref.pricePerGame}/jogo
              </span>
              <span>{ref.experienceYears} anos de experiência</span>
            </div>
          </div>
          <Button
            asChild
            className="bg-referee text-referee-foreground hover:bg-referee/90"
          >
            <Link to="/perfil/editar">
              <Pencil className="mr-1.5 h-4 w-4" /> Editar perfil
            </Link>
          </Button>
        </div>
      </Card>

      {/* Tier card destacado + stats business */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          className={cn(
            "relative overflow-hidden border-2 p-5 lg:col-span-1",
            tierInfo.tokenClass,
          )}
        >
          <div className="absolute inset-0 bg-gradient-referee opacity-5" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Categoria atual
              </span>
            </div>
            <div className="mt-2 font-display text-3xl uppercase tracking-wide">
              {tierInfo.label}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {tierInfo.description}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-1.5">
              {(["Bronze", "Prata", "Ouro"] as const).map((t) => {
                const info = REFEREE_TIER_INFO[t];
                const active = tier === t;
                return (
                  <div
                    key={t}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-center font-mono text-[10px] uppercase tracking-wider",
                      active
                        ? info.tokenClass + " bg-card/60 font-semibold"
                        : "border-border opacity-50",
                    )}
                  >
                    {info.label}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="border-border bg-card p-5 lg:col-span-2">
          <h2 className="font-display text-lg uppercase tracking-wide">
            Sobre
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile.bio || ref.bio}
          </p>

          <div className="mt-4">
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Certificações
            </h3>
            {ref.certifications.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Nenhuma certificação registrada.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {ref.certifications.map((c) => (
                  <Badge
                    key={c}
                    variant="outline"
                    className="border-referee/50 text-referee"
                  >
                    <Award className="mr-1 h-3 w-3" />
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Disponibilidade */}
      <Card className="border-border bg-card p-5">
        <h2 className="font-display text-lg uppercase tracking-wide">
          Disponibilidade
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <Calendar className="mr-0.5 inline h-3 w-3" /> Datas
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {ref.availableDays.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  Nenhuma data cadastrada.
                </span>
              ) : (
                ref.availableDays.map((d) => (
                  <Badge
                    key={d}
                    variant="outline"
                    className="border-border text-xs"
                  >
                    {new Date(d).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <Clock className="mr-0.5 inline h-3 w-3" /> Horários
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {ref.availableTimes.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  Nenhum horário cadastrado.
                </span>
              ) : (
                ref.availableTimes.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="border-border text-xs"
                  >
                    {t}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Conquistas */}
      <Card className="border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-referee" />
            <h2 className="font-display text-xl uppercase tracking-wide">
              Conquistas
            </h2>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {unlocked}/{total} desbloqueadas
          </span>
        </div>

        <div className="mb-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono uppercase tracking-wider text-muted-foreground">
              Progresso geral
            </span>
            <span className="font-mono text-referee">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition",
                a.unlocked
                  ? "border-referee/40 bg-referee/5"
                  : "border-border bg-surface opacity-80",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl",
                  a.unlocked ? "bg-referee/15" : "bg-muted",
                )}
              >
                {a.unlocked ? a.emoji : <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  {a.title}
                  {a.unlocked && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-referee" />
                  )}
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
