import { useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function FiltersPanel({
  children,
  count = 0,
  onClear,
}: {
  children: ReactNode;
  count?: number;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          className="font-display uppercase tracking-wide"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filtros
          {count > 0 && (
            <span className="ml-2 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </Button>
        {open && onClear && count > 0 && (
          <Button size="sm" variant="ghost" onClick={onClear}>
            <X className="mr-1 h-3 w-3" /> Limpar
          </Button>
        )}
      </div>
      {open && <Card className="border-border bg-card p-4">{children}</Card>}
    </div>
  );
}
