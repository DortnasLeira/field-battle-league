import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SubmitScoreSchema = z.object({
  matchId: z.string().min(1).max(100),
  home: z.number().int().min(0).max(99),
  away: z.number().int().min(0).max(99),
  byTeamId: z.string().min(1).max(100),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const submitScoreFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SubmitScoreSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { matchId, byTeamId, home, away } = data;

    // Real backend records use UUIDs. Mock fixtures use ids like "t1"/"m10" —
    // those bypass DB existence checks but the auth middleware still enforces login.
    const teamIsUuid = UUID_RE.test(byTeamId);
    const matchIsUuid = UUID_RE.test(matchId);

    if (teamIsUuid) {
      // Confirm the user is a member (owner or admin) of the team they claim to represent.
      const { data: membership, error: mErr } = await supabase
        .from("team_members")
        .select("id, role")
        .eq("team_id", byTeamId)
        .eq("user_id", userId)
        .maybeSingle();
      if (mErr) throw new Error("Falha ao validar time.");
      if (!membership) {
        throw new Response("Forbidden: você não pertence a este time.", { status: 403 });
      }
    }

    if (matchIsUuid) {
      // Confirm the match exists and that byTeamId is one of the two participating teams.
      const { data: match, error: matchErr } = await supabase
        .from("matches")
        .select("id, home_team_id, away_team_id, challenge_id")
        .eq("id", matchId)
        .maybeSingle();
      if (matchErr) throw new Error("Falha ao validar partida.");
      if (!match) {
        throw new Response("Partida não encontrada.", { status: 404 });
      }
      if (teamIsUuid && match.home_team_id !== byTeamId && match.away_team_id !== byTeamId) {
        throw new Response("Time informado não participa desta partida.", { status: 403 });
      }

      // Persist the submitted score. RLS additionally ensures the user is a member
      // of one of the participating teams.
      const { error: upErr } = await supabase
        .from("matches")
        .update({
          home_score: home,
          away_score: away,
          status: "completed",
          played_at: new Date().toISOString(),
          reported_by: userId,
        })
        .eq("id", matchId);
      if (upErr) throw new Error("Falha ao registrar placar.");
    }

    return {
      ok: true as const,
      matchId,
      home,
      away,
      byTeamId,
      userId,
    };
  });
