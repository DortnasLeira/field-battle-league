import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Trophy, MapPin, Swords, Shield, UserPlus, LogOut, ChevronsUpDown, Plus, LogIn, User, Settings, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth, PROFILE_TYPE_LABEL, PROFILE_TYPE_EMOJI, frameClass } from "@/lib/auth";
import { toast } from "sonner";

const publicLinks = [
  { to: "/buscar", label: "Buscar", icon: Search },
  { to: "/ligas", label: "Ligas", icon: Trophy },
  { to: "/campos", label: "Campos", icon: MapPin },
  { to: "/vagas", label: "Vagas", icon: UserPlus },
] as const;

const authLinks = [
  { to: "/desafios", label: "Desafios", icon: Swords },
] as const;

const PROTECTED = new Set<string>(["/perfil", "/vagas", "/desafios"]);

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useAuth();
  const navigate = useNavigate();
  const isActive = (to: string) => pathname.startsWith(to);
  const links = session ? [...publicLinks, ...authLinks] : publicLinks;
  const cols = links.length;

  const handleNav = (to: string) => (e: React.MouseEvent) => {
    if (!session && PROTECTED.has(to)) {
      e.preventDefault();
      toast.error("Faça login para acessar.");
      navigate({ to: "/auth", search: { redirect: to } });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/buscar" className="flex items-center gap-2">
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
              onClick={handleNav(to)}
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

        <ProfileSwitcher />
      </div>

      <nav
        className="grid border-t border-border bg-surface md:hidden"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={handleNav(to)}
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

function ProfileSwitcher() {
  const { session, profiles, activeProfile, setActive, signOut } = useAuth();
  const navigate = useNavigate();

  if (!session) {
    return (
      <Button size="sm" className="bg-gradient-primary text-primary-foreground" onClick={() => navigate({ to: "/auth" })}>
        <LogIn className="mr-1 h-4 w-4" /> Entrar
      </Button>
    );
  }

  if (!activeProfile) {
    return (
      <Button size="sm" variant="outline" onClick={() => navigate({ to: "/onboarding" })}>
        <Plus className="mr-1 h-4 w-4" /> Criar perfil
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 transition hover:border-primary/40">
          <div
            className={cn("flex h-8 w-8 items-center justify-center rounded-md text-lg", frameClass(activeProfile.frame))}
            style={{ background: activeProfile.color + "22", color: activeProfile.color }}
          >
            {activeProfile.avatar ?? PROFILE_TYPE_EMOJI[activeProfile.type]}
          </div>
          <div className="hidden text-left leading-tight sm:block">
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {PROFILE_TYPE_LABEL[activeProfile.type]}
            </div>
            <div className="text-xs font-semibold">{activeProfile.nickname || activeProfile.name}</div>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Trocar perfil
        </DropdownMenuLabel>
        {profiles.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onClick={() => {
              setActive(p.id);
              toast.success(`Perfil ${PROFILE_TYPE_LABEL[p.type]} ativado.`);
            }}
            className="gap-3"
          >
            <div
              className={cn("flex h-8 w-8 items-center justify-center rounded-md text-base", frameClass(p.frame))}
              style={{ background: p.color + "22", color: p.color }}
            >
              {p.avatar ?? PROFILE_TYPE_EMOJI[p.type]}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{p.nickname || p.name}</div>
              <div className="font-mono text-[9px] uppercase text-muted-foreground">{PROFILE_TYPE_LABEL[p.type]}</div>
            </div>
            {p.id === activeProfile.id && <span className="text-[10px] text-primary">●</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/onboarding" })}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar tipo de perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/perfil" })}>
          <Settings className="mr-2 h-4 w-4" /> Editar perfis
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            toast.success("Sessão encerrada.");
            navigate({ to: "/auth" });
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
