import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";
import { computeSlotPrice, type PricingRule } from "@/lib/pricing";

export const createBookingCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    subFieldId: string;
    scheduledAt: string; // ISO
    teamId?: string;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.subFieldId)) throw new Error("Invalid subFieldId");
    if (data.teamId && !/^[0-9a-f-]{36}$/i.test(data.teamId)) throw new Error("Invalid teamId");
    if (Number.isNaN(Date.parse(data.scheduledAt))) throw new Error("Invalid scheduledAt");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sub, error } = await supabase
      .from("sub_fields")
      .select("id, name, price_per_hour, venue_id, venues:venue_id(name)")
      .eq("id", data.subFieldId)
      .maybeSingle();
    if (error || !sub) throw new Error("Campo não encontrado");

    const amountCents = Math.round(Number(sub.price_per_hour) * 100);
    if (!amountCents || amountCents < 50) throw new Error("Preço inválido para este campo");

    const venueName = (sub.venues as { name?: string } | null)?.name ?? "Estabelecimento";

    const stripe = createStripeClient(data.environment);
    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: "brl",
          product_data: { name: `${venueName} — ${sub.name} (1h)` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      metadata: {
        kind: "sub_field_booking",
        userId,
        subFieldId: data.subFieldId,
        scheduledAt: data.scheduledAt,
        ...(data.teamId && { teamId: data.teamId }),
      },
    });

    return session.client_secret;
  });

export type BookingConfirmation = {
  ok: boolean;
  bookingId?: string;
  message?: string;
};

export const confirmBookingFromSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) => {
    if (!data.sessionId || data.sessionId.length > 200) throw new Error("Invalid sessionId");
    return data;
  })
  .handler(async ({ data, context }): Promise<BookingConfirmation> => {
    const { supabase, userId } = context;
    const stripe = createStripeClient(data.environment);
    const session = await stripe.checkout.sessions.retrieve(data.sessionId);

    if (session.payment_status !== "paid") {
      return { ok: false, message: "Pagamento ainda não confirmado." };
    }
    const md = session.metadata ?? {};
    if (md.kind !== "sub_field_booking") return { ok: false, message: "Sessão não é uma reserva." };
    if (md.userId !== userId) return { ok: false, message: "Usuário não corresponde à sessão." };
    const subFieldId = md.subFieldId;
    const scheduledAt = md.scheduledAt;
    if (!subFieldId || !scheduledAt) return { ok: false, message: "Dados incompletos." };

    // Idempotência: evita duplicar se o usuário recarregar a página de retorno
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("sub_field_id", subFieldId)
      .eq("requester_user_id", userId)
      .eq("scheduled_at", scheduledAt)
      .maybeSingle();
    if (existing) return { ok: true, bookingId: existing.id };

    // sub_fields não tem field_id: bookings.field_id é NOT NULL, usamos venue_id como fallback
    const { data: sf } = await supabase
      .from("sub_fields")
      .select("venue_id")
      .eq("id", subFieldId)
      .maybeSingle();
    const fieldId = sf?.venue_id ?? subFieldId;

    const { data: inserted, error } = await supabase
      .from("bookings")
      .insert({
        field_id: fieldId,
        sub_field_id: subFieldId,
        requester_user_id: userId,
        requester_team_id: md.teamId ?? null,
        scheduled_at: scheduledAt,
        duration_minutes: 60,
        status: "confirmed",
        message: "Reserva paga via Stripe",
      })
      .select("id")
      .single();
    if (error) return { ok: false, message: error.message };
    return { ok: true, bookingId: inserted.id };
  });
