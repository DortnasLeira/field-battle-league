import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Loader2, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProtectedAccess } from "@/lib/useProtectedAccess";
import { RouteLoadingSkeleton } from "@/components/RouteLoadingSkeleton";
import { CityCombobox } from "@/components/CityCombobox";

export const Route = createFileRoute("/complexo_/editar")({
  head: () => ({ meta: [{ title: "Editar estabelecimento — PeladaPro" }] }),
  component: EditVenuePage,
});

type Venue = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  bio: string | null;
};

function EditVenuePage() {
  const access = useProtectedAccess("field", {
    redirectBack: "/complexo/editar",
    deniedMessage: "Apenas contas Campo podem editar o estabelecimento.",
  });
  const { session } = useAuth();
  const navigate = useNavigate();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [form, setForm] = useState({ name: "", city: "", address: "", phone: "", bio: "" });
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (access.status !== "ready") return;
    (async () => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("venues" as never)
        .select("*")
        .eq("owner_user_id", session.user.id)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      const v = (data as Venue | null) ?? null;
      setVenue(v);
      if (v) {
        setForm({
          name: v.name ?? "",
          city: v.city ?? "",
          address: v.address ?? "",
          phone: v.phone ?? "",
          bio: v.bio ?? "",
        });
      }
      setLoadingData(false);
    })();
  }, [access.status, session]);

  const save = async () => {
    if (!venue) return;
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("venues" as never)
      .update({
        name: form.name.trim(),
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
      } as never)
      .eq("id", venue.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Estabelecimento atualizado.");
    navigate({ to: "/perfil" });
  };

  if (access.status === "loading") {
    return <RouteLoadingSkeleton label="Carregando estabelecimento" />;
  }

  if (loadingData) {
    return (
      <Card className="flex items-center justify-center p-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
      </Card>
    );
  }

  if (!venue) {
    return (
      <Card className="space-y-3 p-10 text-center">
        <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="font-display text-xl uppercase">Sem estabelecimento</h2>
        <p className="text-sm text-muted-foreground">Cadastre seu complexo no onboarding.</p>
        <Button onClick={() => navigate({ to: "/onboarding" })} className="bg-gradient-primary text-primary-foreground">
          Ir para o onboarding
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/perfil"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
      </Button>

      <div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-wider">Estabelecimento</span>
        </div>
        <h1 className="mt-1 font-display text-3xl uppercase tracking-wider">
          Editar <span className="text-gradient-primary">complexo</span>
        </h1>
      </div>

      <Card className="space-y-4 border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome do estabelecimento *</Label>
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div>
            <Label>Cidade</Label>
            <CityCombobox value={form.city} onChange={(v) => setForm((s) => ({ ...s, city: v }))} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} placeholder="(11) 99999-0000" />
          </div>
          <div className="sm:col-span-2">
            <Label>Endereço</Label>
            <Input value={form.address} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} placeholder="Rua, número, bairro" />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setForm((s) => ({ ...s, bio: e.target.value }))}
              placeholder="Conte sobre a estrutura do complexo."
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar alterações
          </Button>
        </div>
      </Card>
    </div>
  );
}
