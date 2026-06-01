import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton genérico para rotas protegidas enquanto sessão/perfis carregam.
 * Use junto com `useProtectedAccess` para evitar flashes de conteúdo
 * indevido ou redirects prematuros.
 */
export function RouteLoadingSkeleton({ label = "Carregando" }: { label?: string }) {
  return (
    <div
      className="mx-auto max-w-5xl space-y-6 py-6"
      aria-busy="true"
      aria-label={label}
    >
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Card className="space-y-4 border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-32 w-full" />
      </Card>
    </div>
  );
}
