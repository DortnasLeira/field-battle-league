import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Award, Edit, Lock, CheckCircle2, Trophy, Star, MapPin, DollarSign, Flag as Whistle, Calendar, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { frameClass, type UserProfile } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { computeRefereeAchievements, type RefereeStats } from "@/lib/refereeAchievements";
import { REFEREE_TIER_INFO } from "@/lib/mockData";

type RefereeRow = {
  referee_id: string;
  display_name: string;
  city: string | null;
  bio: string | null;
  tier: "bronze" | "prata" | "ouro";
  certifications: string[];
  experience_years: number;
  price_per_game: number;
  available_days: string[];
  available_times: string[];
  score: number;
  reviews_count: number;
  active: boolean;
};

type HireRow = {
  id: string;
  status: "pending" | "confirmed" | "cancelled";
  hire_date: string;
  hire_time: string;
};

const TIER_DB_TO_LABEL = { bronze: "Bronze", prata: "Prata", ouro: "Ouro" } as const;

export function RefereeDashboard({ profile }: { profile: UserProfile }) {
  const [refereeRow, setRefereeRow] = useState<RefereeRow | null>(null);
  const [hires, setHires] = useState<HireRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [{ data: refRow }, { data: hireRows }] = await Promise.all([
        supabase.from("referees").select("*").eq("referee_id", profile.user_id).maybeSingle(),
        supabase.from("referee_hires").select("id, status, hire_date, hire_time").eq("referee_id", profile.user_id),
      ]);
      if (!alive) return;
      setRefereeRow((refRow as RefereeRow | null) ?? null);
      setHires(((hireRows ?? []) as unknown) as HireRow[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [profile.user_id]);

  const tierKey = (refereeRow?.tier ?? "bronze") as keyof typeof TIER_DB_TO_LABEL;
  const tierLabel = TIER_DB_TO_LABEL[tierKey];
  const tierInfo = REFEREE_TIER_INFO[tierLabel];

  const completedHires = hires.filter(h => h.status === "confirmed").length;

  const refStats: RefereeStats = useMemo(() => ({
    isRegistered: true,
    firstHireReceived: hires.length > 0,
    gamesOfficiated: completedHires,
    sumulasSigned: completedHires,
    has5StarReview: (refereeRow?.score ?? 0) === 5 && (refereeRow?.reviews_count ?? 0) > 0,
    tier: tierLabel,
  }), [hires.length, completedHires, refereeRow, tierLabel]);

  const achievements = useMemo(() => computeRefereeAchievements(refStats), [refStats]);
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalProgress = achievements.length > 0 ? unlockedCount / achievements.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden border-referee/40 bg-card p-6 shadow-glow-referee">
        <div className="absolute inset-0 bg-gradient-referee opacity-10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            className={cn(
              "flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl text-5xl",
              frameClass(profile.frame),
            )}
            style={{ background: profile.color + "22", color: profile.color }}
          >
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              profile.avatar ?? "🟨"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Whistle className="h-4 w-4 text-referee" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-referee">Árbitro · Perfil Business</span>
            </div>
            <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl truncate">{profile.name}</h1>
            {profile.nickname && <div className="text-sm text-muted-foreground">"{profile.nickname}"</div>}
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {profile.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.city}</span>}
              <span className="inline-flex items-center gap-1 text-referee">
                <Star className="h-3 w-3 fill-current" />
                {(refereeRow?.score ?? 0).toFixed(1)}{" "}
                <span className="text-muted-foreground">({refereeRow?.reviews_count ?? 0} avaliações)</span>
              </span>
              <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" />R$ {refereeRow?.price_per_game ?? 0}/jogo</span>
              <span>{refereeRow?.experience_years ?? 0} anos de experiência</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("font-display uppercase tracking-wider", tierInfo.tokenClass)}>
                <Trophy className="mr-1 h-3 w-3" /> Categoria {tierInfo.label}
              </Badge>
              <span className="text-[11px] text-muted-foreground">{tierInfo.description}</span>
            </div>
          </div>
          <Button asChild size="lg" className="bg-referee text-referee-foreground hover:bg-referee/90">
            <Link to="/perfil/editar"><Edit className="mr-1.5 h-4 w-4" /> Editar Perfil</Link>
          </Button>
        </div>
      </Card>

      {/* Bio + Tier */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border bg-card p-5 lg:col-span-2">
          <h2 className="font-display text-lg uppercase tracking-wide">Sobre você</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile.bio || refereeRow?.bio || "Adicione uma bio para se apresentar a times e campos."}
          </p>
          <div className="mt-4">
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Certificações</h3>
            {(refereeRow?.certifications?.length ?? 0) === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">Nenhuma certificação registrada.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {refereeRow!.certifications.map((c) => (
                  <Badge key={c} variant="outline" className="border-referee/50 text-referee">
                    <Award className="mr-1 h-3 w-3" />{c}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="mt-5">
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Sistema de Categorias</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(["Bronze", "Prata", "Ouro"] as const).map((t) => {
                const info = REFEREE_TIER_INFO[t];
                const active = tierLabel === t;
                return (
                  <div key={t} className={cn("rounded-md border p-3", active ? info.tokenClass + " bg-card/60" : "border-border opacity-60")}>
                    <div className="flex items-center gap-1 font-display uppercase tracking-wide">
                      <Trophy className="h-3.5 w-3.5" />{info.label}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{info.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="border-border bg-card p-5">
          <h2 className="font-display text-lg uppercase tracking-wide">Disponibilidade</h2>
          <div className="mt-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <Calendar className="mr-0.5 inline h-3 w-3" /> Datas
            </div>
            {(refereeRow?.available_days?.length ?? 0) === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">Nenhuma data cadastrada.</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1">
                {refereeRow!.available_days.map((d) => (
                  <Badge key={d} variant="outline" className="border-border text-xs">
                    {new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="mt-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <Clock className="mr-0.5 inline h-3 w-3" /> Horários
            </div>
            {(refereeRow?.available_times?.length ?? 0) === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">Nenhum horário cadastrado.</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1">
                {refereeRow!.available_times.map((t) => (
                  <Badge key={t} variant="outline" className="border-border text-xs">{t}</Badge>
                ))}
              </div>
            )}
          </div>
          <Button asChild variant="outline" size="sm" className="mt-4 w-full">
            <Link to="/arbitragem">Ver pedidos e súmulas</Link>
          </Button>
        </Card>
      </div>

      {/* Achievements */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg uppercase tracking-wide flex items-center gap-2">
              <Trophy className="h-5 w-5 text-referee" /> Conquistas de árbitro
            </h2>
            <p className="text-xs text-muted-foreground">
              {unlockedCount} de {achievements.length} desbloqueadas
            </p>
          </div>
        </div>
        <div className="mt-3">
          <Progress value={totalProgress * 100} className="h-2" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition",
                a.unlocked ? "border-referee/40 bg-referee/5" : "border-dashed border-border bg-surface/40 opacity-80",
              )}
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl", a.unlocked ? "bg-referee/15" : "bg-muted")}>
                {a.unlocked ? a.emoji : <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  {a.title}
                  {a.unlocked && <CheckCircle2 className="h-3.5 w-3.5 text-referee" />}
                </div>
                <div className="text-[11px] text-muted-foreground">{a.description}</div>
                {!a.unlocked && (
                  <div className="mt-1 text-[10px] font-medium text-muted-foreground">
                    Falta: {a.remaining} ({a.current}/{a.target})
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {loading && <p className="mt-3 text-[11px] text-muted-foreground">Carregando dados…</p>}
      </Card>
    </div>
  );
}
