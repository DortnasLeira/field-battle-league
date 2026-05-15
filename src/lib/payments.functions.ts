import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    priceId: string;
    teamId: string;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    if (!/^[0-9a-f-]{36}$/i.test(data.teamId)) throw new Error("Invalid teamId");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    const { data: ownerCheck } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", userId)
      .eq("team_id", data.teamId)
      .eq("role", "owner")
      .maybeSingle();
    if (!ownerCheck) throw new Error("Apenas o dono do time pode assinar o PRO.");

    const stripe = createStripeClient(data.environment);
    const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];

    const { data: userInfo } = await supabase.auth.getUser();
    const email = userInfo.user?.email ?? undefined;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: "subscription",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      ...(email && { customer_email: email }),
      subscription_data: {
        trial_period_days: 30,
        metadata: { userId, teamId: data.teamId },
      },
      metadata: { userId, teamId: data.teamId },
    });

    return session.client_secret;
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_customer_id) throw new Error("Sem assinatura encontrada.");

    const stripe = createStripeClient(data.environment);
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      ...(data.returnUrl && { return_url: data.returnUrl }),
    });
    return portal.url;
  });

export type InvoiceRow = {
  id: string;
  number: string | null;
  amount_paid: number;
  currency: string;
  status: string | null;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  period_start: number | null;
  period_end: number | null;
};

export const listInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<InvoiceRow[]> => {
    try {
      const { supabase, userId } = context;
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .eq("environment", data.environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!sub?.stripe_customer_id) return [];

      const stripe = createStripeClient(data.environment);
      const invoices = await stripe.invoices.list({
        customer: sub.stripe_customer_id as string,
        limit: 24,
      });
      return invoices.data.map((i) => ({
        id: i.id ?? "",
        number: i.number ?? null,
        amount_paid: i.amount_paid,
        currency: i.currency,
        status: i.status ?? null,
        created: i.created,
        hosted_invoice_url: i.hosted_invoice_url ?? null,
        invoice_pdf: i.invoice_pdf ?? null,
        period_start: i.period_start ?? null,
        period_end: i.period_end ?? null,
      }));
    } catch (e) {
      console.error("listInvoices failed:", e);
      return [];
    }
  });
