import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Trophy, MapPin, Swords, Shield, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/ligas", label: "Ligas", icon: Trophy },
  { to: "/campos", label: "Campos", icon: MapPin },
  { to: "/desafios", label: "Desafios", icon: Swords },
  { to: "/vagas", label: "Vagas", icon: UserPlus },
  { to: "/perfil", label: "Perfil", icon: Shield },
] as const;

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary shadow-glow">
            <span className="text-lg">⚽</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg uppercase tracking-wider text-foreground">
              Pelada<span className="text-primary">Pro</span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Liga · Campo · Batalha
            </span>
          </div>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "group inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(to)
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", isActive(to) && "text-primary")} />
              <span className="font-display uppercase tracking-wide">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 md:flex">
          <span className="text-xl">🦁</span>
          <div className="leading-tight">
            <div className="font-display text-xs uppercase text-muted-foreground">Capitão</div>
            <div className="text-xs font-semibold">Leões da Vila</div>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="grid grid-cols-6 border-t border-border bg-surface md:hidden">
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[10px] uppercase tracking-wide",
              isActive(to) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
