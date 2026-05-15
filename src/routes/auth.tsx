import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, LogIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — PeladaPro" },
      { name: "description", content: "Acesse sua conta PeladaPro com Google ou e-mail." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, onboardingStep, accountType, loading } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  useEffect(() => {
    if (loading) return;
    if (session) {
      if (onboardingStep < 100) {
        navigate({ to: "/onboarding" });
      } else if (redirect && redirect.startsWith("/")) {
        window.location.replace(redirect);
      } else {
        const dest = accountType === "business" ? "/complexo" : accountType === "team" ? "/painel" : "/perfil";
        navigate({ to: dest });
      }
    }
  }, [session, onboardingStep, accountType, loading, navigate, redirect]);

  return (
    <div className="mx-auto max-w-md py-10">
      <Card className="border-border bg-card p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <span className="text-3xl">⚽</span>
          </div>
          <h1 className="font-display text-2xl uppercase tracking-wider">
            Pelada<span className="text-primary">Pro</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre para gerenciar seus perfis.</p>
        </div>

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={async () => {
            const r = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin + "/auth",
            });
            if (r.error) toast.error("Falha ao entrar com Google");
          }}
        >
          <GoogleIcon /> Continuar com Google
        </Button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">ou e-mail</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="mt-4">
            <EmailForm mode="signin" />
          </TabsContent>
          <TabsContent value="signup" className="mt-4">
            <EmailForm mode="signup" />
          </TabsContent>
        </Tabs>

        <p className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
          <Link to="/forgot-password" className="underline underline-offset-4 hover:text-foreground">
            Esqueci a senha
          </Link>
          <Link to="/" className="underline underline-offset-4 hover:text-foreground">
            Voltar para a home
          </Link>
        </p>
      </Card>
    </div>
  );
}

function EmailForm({ mode }: { mode: "signin" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="email" type="email" required className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@gmail.com" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="password" type="password" required minLength={6} className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
        </div>
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground">
        <LogIn className="mr-2 h-4 w-4" /> {mode === "signup" ? "Criar conta" : "Entrar"}
      </Button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.8 29 5 24 5 16.3 5 9.7 9.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43c5 0 9.5-1.9 12.9-5l-6-4.9c-1.9 1.4-4.4 2.4-7 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 38.6 16.2 43 24 43z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6 4.9c-.4.4 6.5-4.7 6.5-14.5 0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
