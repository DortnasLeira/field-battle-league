import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SubmitScoreSchema = z.object({
  matchId: z.string().min(1).max(100),
  home: z.number().int().min(0).max(99),
  away: z.number().int().min(0).max(99),
  byTeamId: z.string().min(1).max(100),
});

export const submitScoreFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SubmitScoreSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Auth enforced by middleware; userId available in context
    return {
      ok: true as const,
      matchId: data.matchId,
      home: data.home,
      away: data.away,
      byTeamId: data.byTeamId,
      userId: context.userId,
    };
  });
