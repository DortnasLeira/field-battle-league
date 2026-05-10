// Shared pricing logic used by client (preview) and server (Stripe checkout).
// Keep this file pure (no env / no I/O) so it is safe to import anywhere.

export type PricingRuleMode = "percent" | "fixed";

export type PricingRule = {
  id: string;
  name: string;
  // Day ids matching available_days: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
  days: string[];
  start: string; // "HH:MM"
  end: string;   // "HH:MM" (exclusive)
  mode: PricingRuleMode;
  value: number; // percent surcharge (e.g. 30 = +30%) OR fixed BRL price for the hour
};

const DAY_IDS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => Number(n));
  return (h || 0) * 60 + (m || 0);
}

export function dayIdFor(date: Date): string {
  return DAY_IDS[date.getDay()];
}

/** True when the given Date falls inside the rule's day+time window. */
export function ruleMatches(rule: PricingRule, date: Date): boolean {
  if (!rule || !Array.isArray(rule.days) || rule.days.length === 0) return false;
  if (!rule.days.includes(dayIdFor(date))) return false;
  const t = date.getHours() * 60 + date.getMinutes();
  const s = toMinutes(rule.start);
  const e = toMinutes(rule.end);
  // Support overnight ranges (e.g. 22:00 -> 02:00)
  return s <= e ? t >= s && t < e : t >= s || t < e;
}

/**
 * Compute the price for a given slot.
 * - If a "fixed" rule matches, returns its value (highest fixed wins).
 * - Else applies the largest matching percent surcharge to the base price.
 */
export function computeSlotPrice(
  basePricePerHour: number,
  rules: PricingRule[] | null | undefined,
  scheduledAtIso: string,
): { price: number; rule: PricingRule | null } {
  const base = Number(basePricePerHour) || 0;
  const list = Array.isArray(rules) ? rules : [];
  const date = new Date(scheduledAtIso);
  if (Number.isNaN(date.getTime())) return { price: base, rule: null };

  const matching = list.filter((r) => ruleMatches(r, date));
  if (matching.length === 0) return { price: base, rule: null };

  const fixed = matching.filter((r) => r.mode === "fixed");
  if (fixed.length > 0) {
    const top = fixed.reduce((a, b) => (Number(b.value) > Number(a.value) ? b : a));
    return { price: Math.max(0, Number(top.value) || 0), rule: top };
  }
  const top = matching.reduce((a, b) => (Number(b.value) > Number(a.value) ? b : a));
  const price = base * (1 + (Number(top.value) || 0) / 100);
  return { price: Math.round(price * 100) / 100, rule: top };
}

export function describeRule(r: PricingRule): string {
  const tag = r.mode === "fixed" ? `R$ ${Number(r.value).toFixed(2)}` : `+${Number(r.value)}%`;
  return `${r.name || "Horário nobre"} · ${tag}`;
}
