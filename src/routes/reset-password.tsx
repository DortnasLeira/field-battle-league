import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Redefinir senha — PeladaPro" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase publica o evento PASSWORD_RECOVERY ao abrir o link do e-mail
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Também aceita se o usuário já tem sessão ativa (link recém aberto)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada!");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar senha");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-10 px-4">
      <Card className="p-6">
        <h1 className="font-display text-2xl uppercase tracking-wider">Redefinir senha</h1>
        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Abra esta página pelo link enviado ao seu e-mail.{" "}
            <Link to="/forgot-password" className="underline">
              Reenviar
            </Link>
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="pwd">Nova senha</Label>
              <Input
                id="pwd"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Salvando..." : "Atualizar senha"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
