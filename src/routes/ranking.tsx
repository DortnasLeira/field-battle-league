import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth, isBusinessAccount } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking Elo — PeladaPro" },
      { name: "description", content: "Classificação de times por rating Elo, evolução e métricas das ligas." },
    ],
  }),
  component: RankingPage,
});

type TeamRow = {
  id: string;
  name: string;
  shield: string | null;
  city: string | null;
  rating: number;
  fair_play: number;
  verified: boolean | null;
};

type MatchRow = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

function tier(r: number) {
  if (r >= 1900) return { label: "Elite", tone: "bg-gradient-to-r from-primary to-primary/70 text-background" };
  if (r >= 1700) return { label: "Avançado", tone: "bg-primary/15 text-primary" };
  if (r >= 1500) return { label: "Intermediário", tone: "bg-secondary text-foreground" };
  if (r >= 1300) return { label: "Em ascensão", tone: "bg-muted text-foreground" };
  return { label: "Iniciante", tone: "bg-muted text-muted-foreground" };
}

function RankingPage() {
  const { accountType } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [matchesByTeam, setMatchesByTeam] = useState<Record<string, MatchRow[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isBusinessAccount(accountType)) {
      toast.error("Ranking é exclusivo de perfis Esportista.");
      navigate({ to: "/perfil" });
    }
  }, [accountType, navigate]);

  useEffect(() => {
    (async () => {
      const [{ data: ts }, { data: ms }] = await Promise.all([
        supabase
          .from("teams")
          .select("id, name, shield, city, rating, fair_play, verified")
          .order("rating", { ascending: false })
          .limit(100),
        supabase
          .from("matches")
          .select("id, home_team_id, away_team_id, home_score, away_score, status")
          .eq("status", "completed")
          .order("played_at", { ascending: false })
          .limit(500),
      ]);
      const map: Record<string, MatchRow[]> = {};
      (ms ?? []).forEach((m) => {
        if (m.home_team_id) (map[m.home_team_id] ||= []).push(m as MatchRow);
        if (m.away_team_id) (map[m.away_team_id] ||= []).push(m as MatchRow);
      });
      setTeams((ts ?? []) as TeamRow[]);
      setMatchesByTeam(map);
      setLoading(false);
    })();
  }, []);

  const rows = useMemo(() => {
    return teams.map((t, i) => {
      const ms = (matchesByTeam[t.id] ?? []).slice(0, 5);
      let w = 0, d = 0, l = 0, gf = 0, ga = 0;
      const form: ("V" | "E" | "D")[] = [];
      ms.forEach((m) => {
        const home = m.home_team_id === t.id;
        const my = home ? (m.home_score ?? 0) : (m.away_score ?? 0);
        const opp = home ? (m.away_score ?? 0) : (m.home_score ?? 0);
        gf += my; ga += opp;
        if (my > opp) { w++; form.push("V"); }
        else if (my < opp) { l++; form.push("D"); }
        else { d++; form.push("E"); }
      });
      const trend = w - l;
      return { team: t, position: i + 1, w, d, l, sg: gf - ga, form, trend, jogos: ms.length };
    });
  }, [teams, matchesByTeam]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <header>
        <h1 className="font-display text-2xl uppercase tracking-wider sm:text-3xl">
          <Trophy className="mr-2 inline h-6 w-6 text-primary" />
          Ranking Elo
        </h1>
        <p className="text-sm text-muted-foreground">Classificação por rating Elo, com evolução recente e métricas das últimas partidas.</p>
      </header>

      <Card className="border-border bg-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface">
              <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-3 w-12">#</th>
                <th className="px-3 py-3">Time</th>
                <th className="px-3 py-3">Tier</th>
                <th className="px-3 py-3 text-right">Elo</th>
                <th className="px-3 py-3 text-center">Forma</th>
                <th className="px-3 py-3 text-right hidden sm:table-cell">V/E/D</th>
                <th className="px-3 py-3 text-right hidden md:table-cell">SG</th>
                <th className="px-3 py-3 text-right hidden md:table-cell">Fair Play</th>
                <th className="px-3 py-3 text-center w-10">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    Sem times no ranking ainda.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const t = tier(r.team.rating);
                const TrendIcon = r.trend > 0 ? TrendingUp : r.trend < 0 ? TrendingDown : Minus;
                const trendColor = r.trend > 0 ? "text-emerald-500" : r.trend < 0 ? "text-destructive" : "text-muted-foreground";
                return (
                  <tr key={r.team.id} className="border-b border-border/50 hover:bg-surface/60">
                    <td className="px-3 py-3 font-display text-base">
                      {r.position <= 3 ? (
                        <span className="inline-flex items-center gap-1">
                          <Crown className={cn(
                            "h-4 w-4",
                            r.position === 1 ? "text-yellow-400" : r.position === 2 ? "text-slate-300" : "text-amber-700",
                          )} />
                          {r.position}
                        </span>
                      ) : (
                        r.position
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Link to="/time/$id" params={{ id: r.team.id }} className="flex items-center gap-2 hover:text-primary">
                        <span className="text-xl">{r.team.shield || "🛡️"}</span>
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{r.team.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{r.team.city || "—"}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={t.tone}>{t.label}</Badge>
                    </td>
                    <td className="px-3 py-3 text-right stat-num font-bold">{Math.round(r.team.rating)}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center gap-1">
                        {r.form.length === 0 ? (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        ) : r.form.map((f, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
                              f === "V" ? "bg-emerald-500/20 text-emerald-500" :
                              f === "D" ? "bg-destructive/20 text-destructive" :
                              "bg-muted text-muted-foreground",
                            )}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right hidden sm:table-cell font-mono text-xs">
                      {r.w}/{r.d}/{r.l}
                    </td>
                    <td className="px-3 py-3 text-right hidden md:table-cell font-mono text-xs">
                      {r.sg > 0 ? `+${r.sg}` : r.sg}
                    </td>
                    <td className="px-3 py-3 text-right hidden md:table-cell font-mono text-xs">
                      {Math.round(Number(r.team.fair_play ?? 100))}%
                    </td>
                    <td className="px-3 py-3 text-center">
                      <TrendIcon className={cn("inline h-4 w-4", trendColor)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Elo recalculado automaticamente após cada partida concluída · K=24 · ajuste por saldo de gols.
      </p>
    </div>
  );
}
