import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CreditCard, ExternalLink, Loader2, Receipt, Crown, Calendar, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { createPortalSession, listInvoices, type InvoiceRow } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { toast } from "sonner";

export const Route = createFileRoute("/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos — PeladaPro" },
      { name: "description", content: "Gerencie sua assinatura, plano e histórico de transações." },
    ],
  }),
  component: PagamentosPage,
});

type SubRow = {
  id: string;
  stripe_subscription_id: string;
  team_id: string | null;
  price_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  active: { label: "Ativa", tone: "bg-emerald-500/15 text-emerald-500" },
  trialing: { label: "Em teste grátis", tone: "bg-primary/15 text-primary" },
  past_due: { label: "Pagamento pendente", tone: "bg-amber-500/15 text-amber-500" },
  canceled: { label: "Cancelada", tone: "bg-destructive/15 text-destructive" },
  incomplete: { label: "Incompleta", tone: "bg-muted text-muted-foreground" },
  unpaid: { label: "Não paga", tone: "bg-destructive/15 text-destructive" },
  paused: { label: "Pausada", tone: "bg-muted text-muted-foreground" },
};

function PagamentosPage() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const env = getStripeEnvironment();
  const portalFn = useServerFn(createPortalSession);
  const invoicesFn = useServerFn(listInvoices);

  const [subs, setSubs] = useState<SubRow[]>([]);
  const [teamsById, setTeamsById] = useState<Record<string, string>>({});
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      navigate({ to: "/auth", search: { redirect: "/pagamentos" } });
      return;
    }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("subscriptions")
        .select("id, stripe_subscription_id, team_id, price_id, status, current_period_start, current_period_end, cancel_at_period_end")
        .eq("user_id", session.user.id)
        .eq("environment", env)
        .order("created_at", { ascending: false });
      const list = (data ?? []) as SubRow[];
      setSubs(list);

      const teamIds = list.map((s) => s.team_id).filter(Boolean) as string[];
      if (teamIds.length) {
        const { data: ts } = await supabase.from("teams").select("id, name").in("id", teamIds);
        const map: Record<string, string> = {};
        (ts ?? []).forEach((t: any) => (map[t.id] = t.name));
        setTeamsById(map);
      }

      try {
        const inv = await invoicesFn({ data: { environment: env } });
        setInvoices(inv);
      } catch {
        // sem assinatura ou erro de rede
      }
      setLoading(false);
    })();
  }, [session, authLoading, env, navigate, invoicesFn]);

  const openPortal = async () => {
    try {
      setOpeningPortal(true);
      const url = await portalFn({ data: { environment: env, returnUrl: window.location.href } });
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir portal");
    } finally {
      setOpeningPortal(false);
    }
  };

  const formatBRL = (cents: number, currency: string) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasSubs = subs.length > 0;

  return (
    <>
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl uppercase tracking-wider sm:text-3xl">
              <CreditCard className="mr-2 inline h-6 w-6 text-primary" />
              Pagamentos
            </h1>
            <p className="text-sm text-muted-foreground">Assinaturas, plano e recibos.</p>
          </div>
          {hasSubs && (
            <Button onClick={openPortal} variant="outline" disabled={openingPortal} className="gap-2">
              {openingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Gerenciar no portal Stripe
            </Button>
          )}
        </header>

        <Card className="border-border bg-card p-6">
          <h2 className="font-display text-lg uppercase tracking-wide flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" /> Assinaturas
          </h2>
          <div className="mt-4 space-y-3">
            {!hasSubs && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">Você ainda não tem assinaturas ativas.</p>
                <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground">
                  <Link to="/pro">Conhecer Time PRO</Link>
                </Button>
              </div>
            )}
            {subs.map((s) => {
              const status = STATUS_LABEL[s.status] ?? { label: s.status, tone: "bg-muted text-muted-foreground" };
              return (
                <div key={s.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm uppercase tracking-wide">
                          {s.price_id === "team_pro_monthly" ? "Time PRO Mensal" : s.price_id}
                        </span>
                        <Badge className={status.tone}>{status.label}</Badge>
                        {s.cancel_at_period_end && (
                          <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                            <AlertCircle className="mr-1 h-3 w-3" /> Será cancelada
                          </Badge>
                        )}
                      </div>
                      {s.team_id && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Time:{" "}
                          <Link to="/time/$id" params={{ id: s.team_id }} className="text-primary hover:underline">
                            {teamsById[s.team_id] ?? "—"}
                          </Link>
                        </p>
                      )}
                      {s.current_period_end && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {s.cancel_at_period_end ? "Acesso até " : "Próxima cobrança em "}
                          {new Date(s.current_period_end).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="border-border bg-card p-6">
          <h2 className="font-display text-lg uppercase tracking-wide flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" /> Histórico de transações
          </h2>
          <p className="text-xs text-muted-foreground">Últimos recibos emitidos pelo Stripe.</p>
          <div className="mt-4 overflow-x-auto">
            {invoices.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhuma transação registrada.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Nº</th>
                    <th className="py-2 pr-3">Valor</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Recibo</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-mono text-xs">
                        {new Date(i.created * 1000).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">{i.number ?? "—"}</td>
                      <td className="py-2 pr-3 font-semibold">{formatBRL(i.amount_paid, i.currency)}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="text-[10px]">
                          {i.status ?? "—"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">
                        {i.hosted_invoice_url ? (
                          <a href={i.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            Ver
                          </a>
                        ) : (
                          "—"
                        )}
                        {i.invoice_pdf && (
                          <>
                            {" · "}
                            <a href={i.invoice_pdf} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              PDF
                            </a>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
