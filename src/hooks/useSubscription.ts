import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getStripeEnvironment } from "@/lib/stripe";

export type SubscriptionRow = {
  id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  team_id: string | null;
  price_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

function isActive(s: SubscriptionRow | null): boolean {
  if (!s) return false;
  const end = s.current_period_end ? new Date(s.current_period_end).getTime() : null;
  const future = end == null || end > Date.now();
  if (["active", "trialing", "past_due"].includes(s.status) && future) return true;
  if (s.status === "canceled" && end && end > Date.now()) return true;
  return false;
}

export function useSubscription(teamId?: string | null) {
  const { session } = useAuth();
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const env = getStripeEnvironment();
    const userId = session?.user?.id;
    if (!userId) {
      setSub(null);
      setLoading(false);
      return;
    }
    const load = async () => {
      let q = supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1);
      if (teamId) q = q.eq("team_id", teamId);
      const { data } = await q.maybeSingle();
      if (alive) {
        setSub((data as SubscriptionRow | null) ?? null);
        setLoading(false);
      }
    };
    load();
    const ch = supabase
      .channel(`subs-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [session?.user?.id, teamId]);

  return { sub, loading, isActive: isActive(sub) };
}
