import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TransferSchema = z.object({
  teamId: z.string().uuid(),
  newOwnerUserId: z.string().uuid(),
});

export const transferTeamOwnershipFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => TransferSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { teamId, newOwnerUserId } = data;

    if (newOwnerUserId === userId) {
      throw new Response("Você já é o dono deste time.", { status: 400 });
    }

    // Confirm caller is current owner
    const { data: ownerRow, error: ownerErr } = await supabase
      .from("team_members")
      .select("id, role")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .maybeSingle();
    if (ownerErr) throw new Error("Falha ao validar permissão.");
    if (!ownerRow || ownerRow.role !== "owner") {
      throw new Response("Apenas o dono atual pode transferir a gestão.", { status: 403 });
    }

    // New owner must have a profile
    const { data: newProfile, error: npErr } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .eq("id", newOwnerUserId)
      .maybeSingle();
    if (npErr) throw new Error("Falha ao validar novo dono.");
    if (!newProfile) {
      throw new Response("Usuário destino não encontrado.", { status: 404 });
    }

    // Check current membership of new owner
    const { data: existing } = await supabase
      .from("team_members")
      .select("id, role")
      .eq("team_id", teamId)
      .eq("user_id", newOwnerUserId)
      .maybeSingle();

    // Demote current owner to admin
    const { error: demoteErr } = await supabase
      .from("team_members")
      .update({ role: "admin" })
      .eq("id", ownerRow.id);
    if (demoteErr) throw new Error("Falha ao rebaixar dono atual.");

    if (existing) {
      const { error: promoteErr } = await supabase
        .from("team_members")
        .update({ role: "owner" })
        .eq("id", existing.id);
      if (promoteErr) {
        // rollback demotion
        await supabase.from("team_members").update({ role: "owner" }).eq("id", ownerRow.id);
        throw new Error("Falha ao promover novo dono.");
      }
    } else {
      const { error: insertErr } = await supabase
        .from("team_members")
        .insert({ team_id: teamId, user_id: newOwnerUserId, role: "owner" });
      if (insertErr) {
        await supabase.from("team_members").update({ role: "owner" }).eq("id", ownerRow.id);
        throw new Error("Falha ao adicionar novo dono.");
      }
    }

    return { ok: true as const, teamId, newOwnerUserId };
  });
