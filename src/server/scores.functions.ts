import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SubmitScoreSchema = z.object({
  matchId: z.string().regex(UUID_RE, "matchId inválido"),
  home: z.number().int().min(0).max(99),
  away: z.number().int().min(0).max(99),
  byTeamId: z.string().regex(UUID_RE, "byTeamId inválido"),
});

export const submitScoreFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SubmitScoreSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { matchId, byTeamId, home, away } = data;

    // Confirm the user is a member of the team they claim to represent.
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

    // Confirm the match exists and that byTeamId is one of the two participating teams.
    const { data: match, error: matchErr } = await supabase
      .from("matches")
      .select("id, home_team_id, away_team_id, challenge_id, status")
      .eq("id", matchId)
      .maybeSingle();
    if (matchErr) throw new Error("Falha ao validar partida.");
    if (!match) {
      throw new Response("Partida não encontrada.", { status: 404 });
    }
    if (match.home_team_id !== byTeamId && match.away_team_id !== byTeamId) {
      throw new Response("Time informado não participa desta partida.", { status: 403 });
    }
    if (match.status === "completed") {
      throw new Response("Partida já concluída — placar não pode ser alterado.", { status: 409 });
    }
    if (match.status !== "awaiting_score" && match.status !== "awaiting_validation") {
      throw new Response("Placar só pode ser enviado quando a partida estiver aguardando validação.", { status: 409 });
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
      .eq("id", matchId)
      .neq("status", "completed");
    if (upErr) throw new Error("Falha ao registrar placar.");

    return {
      ok: true as const,
      matchId,
      home,
      away,
      byTeamId,
      userId,
    };
  });
