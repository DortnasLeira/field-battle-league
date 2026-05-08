import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: ReturnPage,
});

function ReturnPage() {
  const { session_id } = Route.useSearch();
  return (
    <div className="mx-auto max-w-md py-12 px-4 text-center">
      <Card className="p-8">
        <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-primary" />
        <h1 className="font-display text-2xl uppercase tracking-wider">Pagamento concluído</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {session_id
            ? "Sua assinatura foi processada. O selo PRO aparecerá no seu time em alguns segundos."
            : "Sessão não identificada."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link to="/pro">Ver assinatura</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Início</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
