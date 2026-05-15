import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { confirmBookingFromSession } from "@/lib/bookings.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string; kind?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
    kind: typeof s.kind === "string" ? s.kind : undefined,
  }),
  component: ReturnPage,
});

function ReturnPage() {
  const { session_id, kind } = Route.useSearch();
  const isBooking = kind === "booking";
  const [status, setStatus] = useState<"loading" | "ok" | "error">(isBooking ? "loading" : "ok");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!isBooking || !session_id) return;
    confirmBookingFromSession({ data: { sessionId: session_id, environment: getStripeEnvironment() } })
      .then((res) => {
        if (res.ok) {
          setStatus("ok");
          setMessage("Reserva confirmada e adicionada ao seu Hub.");
        } else {
          setStatus("error");
          setMessage(res.message ?? "Não foi possível confirmar a reserva.");
        }
      })
      .catch((e) => {
        setStatus("error");
        setMessage(e?.message ?? "Erro ao confirmar a reserva.");
      });
  }, [isBooking, session_id]);

  return (
    <div className="mx-auto max-w-md py-12 px-4 text-center">
      <Card className="p-8">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto mb-4 h-14 w-14 animate-spin text-primary" />
            <h1 className="font-display text-2xl uppercase tracking-wider">Confirmando reserva</h1>
            <p className="mt-2 text-sm text-muted-foreground">Aguarde alguns segundos...</p>
          </>
        )}
        {status === "ok" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-primary" />
            <h1 className="font-display text-2xl uppercase tracking-wider">Pagamento concluído</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isBooking
                ? message
                : session_id
                  ? "Sua assinatura foi processada. O selo PRO aparecerá no seu time em alguns segundos."
                  : "Sessão não identificada."}
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="mx-auto mb-4 h-14 w-14 text-destructive" />
            <h1 className="font-display text-2xl uppercase tracking-wider">Atenção</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link to={isBooking ? "/perfil" : "/pro"}>
              {isBooking ? "Ir para meu perfil" : "Ver assinatura"}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/campos">Ver campos</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
