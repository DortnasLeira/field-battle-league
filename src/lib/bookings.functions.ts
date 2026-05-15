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
      .select("id, name, price_per_hour, pricing_rules, venue_id, venues:venue_id(name)")
      .eq("id", data.subFieldId)
      .maybeSingle();
    if (error || !sub) throw new Error("Campo não encontrado");

    const { price, rule } = computeSlotPrice(
      Number(sub.price_per_hour),
      (sub as { pricing_rules?: PricingRule[] | null }).pricing_rules ?? [],
      data.scheduledAt,
    );
    const amountCents = Math.round(price * 100);
    if (!amountCents || amountCents < 50) throw new Error("Preço inválido para este campo");

    // ───── Trava de Segurança: reserva atômica do slot (5 min) ─────
    // RPC roda em uma transação com advisory lock + checagem de conflito.
    // Se o slot estiver ocupado (confirmado ou pending recente de outra pessoa),
    // a função lança erro e o checkout do Stripe NÃO é aberto.
    const { data: bookingId, error: lockError } = await supabase.rpc(
      "reserve_sub_field_slot" as never,
      {
        _sub_field_id: data.subFieldId,
        _scheduled_at: data.scheduledAt,
        _duration_minutes: 60,
        _team_id: data.teamId ?? null,
      } as never,
    );
    if (lockError || !bookingId) {
      const msg = lockError?.message ?? "Slot indisponível";
      // Mensagem amigável para o cliente
      throw new Error(
        msg.includes("indisponível") || msg.includes("40001")
          ? "Este horário acabou de ser reservado por outra pessoa. Escolha outro slot."
          : `Não foi possível bloquear o horário: ${msg}`,
      );
    }

    const venueName = (sub.venues as { name?: string } | null)?.name ?? "Estabelecimento";
    const ruleSuffix = rule ? ` · ${rule.name || "Horário nobre"}` : "";

    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.create({
        line_items: [{
          price_data: {
            currency: "brl",
            product_data: { name: `${venueName} — ${sub.name} (1h)${ruleSuffix}` },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        // Bloqueio expira em 5 minutos no banco; o Stripe respeita o mesmo limite.
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // mínimo aceito pelo Stripe
        metadata: {
          kind: "sub_field_booking",
          userId,
          subFieldId: data.subFieldId,
          scheduledAt: data.scheduledAt,
          bookingId: String(bookingId),
          ...(data.teamId && { teamId: data.teamId }),
        },
      });

      return session.client_secret;
    } catch (e) {
      // Se o Stripe falhar, libera o bloqueio para não prender o slot por 5 min.
      await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId as unknown as string)
        .eq("status", "pending");
      throw e;
    }
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
    const bookingId = md.bookingId;
    if (!bookingId) return { ok: false, message: "Reserva não localizada." };

    // Idempotência: já confirmada → retorna ok.
    const { data: current } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("id", bookingId)
      .maybeSingle();
    if (!current) return { ok: false, message: "Reserva não localizada." };
    if (current.status === "confirmed") return { ok: true, bookingId };

    const { data: updated, error } = await supabase
      .from("bookings")
      .update({ status: "confirmed", message: "Reserva paga via Stripe" })
      .eq("id", bookingId)
      .eq("requester_user_id", userId)
      .select("id")
      .single();
    if (error) return { ok: false, message: error.message };
    return { ok: true, bookingId: updated.id };
  });
