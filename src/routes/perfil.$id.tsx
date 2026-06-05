import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Share2,
  Heart,
  Edit,
  Loader2,
  Building2,
  Trophy,
  Award,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, PROFILE_TYPE_EMOJI, PROFILE_TYPE_LABEL } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/perfil/$id")({
  head: (ctx) => ({
    meta: [
      { title: "Perfil — PeladaPro" },
      { name: "description", content: "Visualize o perfil completo no PeladaPro." },
    ],
  }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { id } = Route.useParams();
  const { session, activeProfile: myActiveProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (cancel) return;
      if (error) {
        toast.error("Erro ao carregar perfil.");
      } else {
        setProfile(data);
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [id]);

  const isOwner = useMemo(
    () => !!(session?.user && profile && profile.user_id === session.user.id),
    [session, profile]
  );

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${profile?.name} — PeladaPro`, url });
      } catch { /* */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  };

  const handleLike = () => {
    if (!session) {
      toast.error("Faça login para curtir este perfil.");
      navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    setIsLiked(!isLiked);
    toast.success(isLiked ? "Curtida removida." : "Você curtiu este perfil!");
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="mx-auto max-w-md space-y-4 p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <MapPin className="h-8 w-8" />
        </div>
        <h2 className="font-display text-xl uppercase">Perfil não encontrado</h2>
        <Button onClick={() => navigate({ to: "/buscar" })} variant="outline" className="w-full">
          Voltar para busca
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/buscar"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
        </Button>
        <div className="flex gap-2">
          <Button onClick={share} variant="outline" size="sm" className="rounded-full">
            <Share2 className="mr-1.5 h-4 w-4" /> Compartilhar
          </Button>
          <Button 
            onClick={handleLike} 
            variant={isLiked ? "default" : "outline"} 
            size="sm" 
            className={cn("rounded-full", isLiked && "bg-red-500 hover:bg-red-600 text-white border-red-500")}
          >
            <Heart className={cn("mr-1.5 h-4 w-4", isLiked && "fill-current")} /> 
            {isLiked ? "Curtido" : "Curtir"}
          </Button>
          {isOwner && (
            <Button asChild size="sm" variant="outline" className="rounded-full border-primary text-primary hover:bg-primary/10">
              <Link to="/perfil/editar">
                <Edit className="mr-1.5 h-4 w-4" /> Editar
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Hero Section with Cover */}
      <Card className="relative overflow-hidden border-border bg-card">
        <div 
          className="h-48 w-full bg-gradient-to-r from-primary/20 to-primary/5 sm:h-64"
          style={profile.cover_url ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          {/* Overlay for better text contrast if needed */}
          <div className="absolute inset-0 bg-black/20" />
        </div>
        
        <div className="relative px-6 pb-6">
          <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
            <div className="-mt-16 flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-surface shadow-xl sm:-mt-20 sm:h-40 sm:w-40">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-6xl">{profile.avatar || PROFILE_TYPE_EMOJI[profile.type]}</span>
              )}
            </div>
            
            <div className="mt-4 flex-1 text-center sm:mt-0 sm:pb-2 sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="font-display text-3xl uppercase tracking-wider text-foreground sm:text-4xl">
                  {profile.name}
                </h1>
                <Badge className="bg-primary/15 text-primary border-primary/20 uppercase tracking-tighter">
                  {PROFILE_TYPE_LABEL[profile.type]}
                </Badge>
              </div>
              {profile.nickname && (
                <p className="font-mono text-sm uppercase tracking-[0.2em] text-primary/80">
                  @{profile.nickname}
                </p>
              )}
              <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground sm:justify-start">
                {profile.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-primary" /> {profile.city}
                  </span>
                )}
                {profile.type === 'field' && profile.address && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4 text-primary" /> {profile.address}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {profile.bio && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Gallery */}
          {profile.gallery_urls && profile.gallery_urls.length > 0 && (
            <Card className="border-border bg-card p-5">
              <h3 className="mb-4 font-display text-lg uppercase tracking-wide">Galeria</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {profile.gallery_urls.map((url: string, i: number) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                    <img src={url} alt={`Galeria ${i}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-110" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Profile Specific Details */}
          <Card className="border-border bg-card p-5">
             <h3 className="mb-4 font-display text-lg uppercase tracking-wide">Informações</h3>
             <div className="grid gap-4 sm:grid-cols-2">
                {profile.type === 'player' && (
                  <>
                    <DetailItem label="Posição" value={profile.position || "Não informada"} icon={Trophy} />
                    <DetailItem label="Nível" value={profile.level || "Iniciante"} icon={Award} />
                    <DetailItem label="Idade" value={profile.age ? `${profile.age} anos` : "—"} icon={Calendar} />
                    <DetailItem label="Pé Preferido" value={profile.preferred_foot || "—"} icon={Trophy} />
                  </>
                )}
                {profile.type === 'team' && (
                  <>
                    <DetailItem label="Nível" value={profile.level || "Amador"} icon={Award} />
                    <DetailItem label="Fundado em" value={profile.founded || "—"} icon={Calendar} />
                    <DetailItem label="Campo Preferido" value={profile.preferred_field || "Visitante"} icon={MapPin} />
                  </>
                )}
                {profile.type === 'field' && (
                  <>
                    <DetailItem label="Tipo de Campo" value={profile.field_type || "Geral"} icon={Building2} />
                    <DetailItem label="Capacidade" value={profile.capacity ? `${profile.capacity} jogadores` : "—"} icon={Trophy} />
                    <DetailItem label="Preço Médio" value={profile.price_per_hour ? `R$ ${profile.price_per_hour}/h` : "—"} icon={DollarSign} />
                  </>
                )}
             </div>
          </Card>
        </div>

        {/* Sidebar / Stats */}
        <div className="space-y-6">
           <Card className="border-border bg-card p-5">
              <h3 className="mb-4 font-display text-sm uppercase tracking-wider text-muted-foreground">Estatísticas</h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Curtidas</span>
                    <span className="font-display text-lg">124</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Visualizações</span>
                    <span className="font-display text-lg">1.2k</span>
                 </div>
                 <Button className="w-full bg-gradient-primary text-primary-foreground">
                    <MessageSquare className="mr-2 h-4 w-4" /> Enviar Mensagem
                 </Button>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}
