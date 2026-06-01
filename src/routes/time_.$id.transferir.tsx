import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck, Search, AlertTriangle, Crown, CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useProtectedAccess } from "@/lib/useProtectedAccess";
import { RouteLoadingSkeleton } from "@/components/RouteLoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { transferTeamOwnershipFn } from "@/lib/teams.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/time_/$id/transferir")({
  head: () => ({ meta: [{ title: "Transferir gestão — PeladaPro" }] }),
  component: TransferPage,
});

type ProfileRow = { id: string; display_name: string | null };

function TransferPage() {
  const { id: teamId } = Route.useParams();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const transferFn = useServerFn(transferTeamOwnershipFn);

  const [team, setTeam] = useState<{ id: string; name: string } | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [currentOwner, setCurrentOwner] = useState<ProfileRow | null>(null);
  const [checking, setChecking] = useState(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ProfileRow | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [transferred, setTransferred] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", search: { redirect: `/time/${teamId}/transferir` } });
  }, [loading, session, teamId, navigate]);

  const loadOwner = async () => {
    const { data: ownerRow } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId)
      .eq("role", "owner")
      .maybeSingle();
    if (!ownerRow?.user_id) {
      setCurrentOwner(null);
      return null;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", ownerRow.user_id)
      .maybeSingle();
    setCurrentOwner(prof ?? null);
    return ownerRow.user_id;
  };

  useEffect(() => {
    if (!session) return;
    (async () => {
      setChecking(true);
      const [{ data: t }, ownerUserId] = await Promise.all([
        supabase.from("teams").select("id,name").eq("id", teamId).maybeSingle(),
        loadOwner(),
      ]);
      setTeam(t ?? null);
      setIsOwner(ownerUserId === session.user.id);
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, teamId]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name")
        .ilike("display_name", `%${q}%`)
        .limit(10);
      if (cancelled) return;
      const me = session?.user.id;
      setResults((data ?? []).filter((r) => r.id !== me));
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, session]);

  const sameAsCurrent = !!selected && !!currentOwner && selected.id === currentOwner.id;
  const isSelf = !!selected && selected.id === session?.user.id;

  const canSubmit = useMemo(
    () =>
      !!selected &&
      !sameAsCurrent &&
      !isSelf &&
      confirmText.trim().toUpperCase() === "TRANSFERIR" &&
      !submitting,
    [selected, sameAsCurrent, isSelf, confirmText, submitting],
  );

  const handleSubmit = async () => {
    if (!selected) return;
    if (sameAsCurrent) {
      toast.error("Este usuário já é o dono atual do time.");
      return;
    }
    if (isSelf) {
      toast.error("Você já é o dono deste time.");
      return;
    }
    setSubmitting(true);
    try {
      await transferFn({ data: { teamId, newOwnerUserId: selected.id } });
      toast.success(`Gestão transferida para ${selected.display_name ?? "novo dono"}.`);
      // Reflect immediately in UI
      setCurrentOwner(selected);
      setIsOwner(false);
      setTransferred(true);
      setSelected(null);
      setQuery("");
      setConfirmText("");
      setResults([]);
      // Re-fetch authoritative owner from backend
      await loadOwner();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao transferir gestão.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || checking) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  }

  if (!team) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Time não encontrado.</p>
        <Button asChild variant="ghost" size="sm" className="mt-3">
          <Link to="/perfil"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
        </Button>
      </Card>
    );
  }

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        {transferred && (
          <Card className="border-emerald-500/40 bg-emerald-500/5 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
              <div>
                <h2 className="font-display uppercase">Transferência concluída</h2>
                <p className="text-sm text-muted-foreground">
                  Novo dono: <strong>{currentOwner?.display_name ?? "—"}</strong>
                </p>
              </div>
            </div>
          </Card>
        )}
        <Card className="border-destructive/40 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <h2 className="font-display text-lg uppercase">
                {transferred ? "Você não é mais o dono" : "Apenas o dono pode transferir"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {transferred ? (
                  <>Sua função em <strong>{team.name}</strong> agora é administrador.</>
                ) : (
                  <>Você não é o dono atual de <strong>{team.name}</strong>.</>
                )}
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link to="/time/$id" params={{ id: teamId }}>Voltar ao time</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/time/$id" params={{ id: teamId }}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao time
          </Link>
        </Button>
        <h1 className="mt-2 font-display text-3xl uppercase tracking-wide">Transferir gestão</h1>
        <p className="text-sm text-muted-foreground">
          Você está prestes a transferir a propriedade de <strong>{team.name}</strong>. Você passará
          a ser administrador e o novo dono terá controle total.
        </p>
      </div>

      {currentOwner && (
        <Card className="border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-primary">Dono atual</div>
              <div className="text-sm font-semibold">{currentOwner.display_name ?? "Sem nome"}</div>
              <div className="text-xs text-muted-foreground">Dono atual</div>
            </div>
          </div>
        </Card>
      )}

      <Card className="space-y-4 p-5">
        <div>
          <Label>Buscar novo dono (nome)</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              placeholder="Digite ao menos 2 caracteres"
              className="pl-9"
            />
          </div>
        </div>

        {searching && <div className="text-xs text-muted-foreground">Buscando…</div>}

        {results.length > 0 && !selected && (
          <div className="divide-y divide-border rounded-md border border-border">
            {results.map((r) => {
              const isCurrent = currentOwner?.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(r)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent/40"
                >
                  <div>
                    <div className="text-sm font-medium">{r.display_name ?? "Sem nome"}</div>
                    <div className="text-xs text-muted-foreground">ID: {r.id.slice(0, 8)}</div>
                  </div>
                  {isCurrent ? (
                    <Badge variant="outline" className="border-primary/40 text-primary">Dono atual</Badge>
                  ) : (
                    <Badge variant="outline">Selecionar</Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {query.length >= 2 && !searching && results.length === 0 && !selected && (
          <p className="text-xs text-muted-foreground">Nenhum usuário encontrado.</p>
        )}

        {selected && (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-primary">Novo dono</div>
            <div className="mt-1 text-sm font-medium">{selected.display_name ?? "Sem nome"}</div>
            <div className="text-xs text-muted-foreground">ID: {selected.id.slice(0, 8)}</div>
            {(sameAsCurrent || isSelf) && (
              <div className="mt-2 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {isSelf
                    ? "Você não pode transferir a gestão para si mesmo."
                    : "Este usuário já é o dono atual. Selecione outro membro."}
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 px-2 text-xs"
              onClick={() => setSelected(null)}
            >
              Trocar
            </Button>
          </div>
        )}
      </Card>

      <Card className={cn("border-destructive/30 bg-destructive/5 p-5", (!selected || sameAsCurrent || isSelf) && "opacity-60")}>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-destructive" />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-display uppercase">Confirmação</h3>
              <p className="text-xs text-muted-foreground">
                Esta ação é irreversível pelo painel. Para confirmar, digite{" "}
                <strong className="font-mono">TRANSFERIR</strong> abaixo.
              </p>
            </div>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="TRANSFERIR"
              disabled={!selected || sameAsCurrent || isSelf}
            />
            <div className="flex justify-end gap-2">
              <Button asChild variant="outline" size="sm" disabled={submitting}>
                <Link to="/time/$id" params={{ id: teamId }}>Cancelar</Link>
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {submitting ? "Transferindo…" : "Confirmar transferência"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
