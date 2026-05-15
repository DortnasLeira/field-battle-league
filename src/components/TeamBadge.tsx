import { useStore } from "@/lib/store";

export function TeamBadge({ teamId, size = "md" }: { teamId: string; size?: "sm" | "md" | "lg" }) {
  const team = useStore((s) => s.teams.find((t) => t.id === teamId));
  if (!team) return null;
  const sizes = {
    sm: { box: "h-7 w-7 text-base", text: "text-xs" },
    md: { box: "h-10 w-10 text-xl", text: "text-sm" },
    lg: { box: "h-14 w-14 text-3xl", text: "text-base" },
  } as const;
  return (
    <div className="flex items-center gap-2">
      <div className={`flex ${sizes[size].box} items-center justify-center rounded-md bg-surface-elevated ring-1 ring-border`}>
        <span>{team.shield}</span>
      </div>
      <div className="leading-tight">
        <div className={`font-semibold ${sizes[size].text}`}>{team.name}</div>
        {size !== "sm" && (
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{team.city}</div>
        )}
      </div>
    </div>
  );
}
