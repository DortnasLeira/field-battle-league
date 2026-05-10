import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, Building2, Clock, ChevronRight, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BookingStripeCheckout } from "@/components/BookingStripeCheckout";
import { computeSlotPrice, describeRule, type PricingRule } from "@/lib/pricing";

export const Route = createFileRoute("/campos")({
  head: () => ({
    meta: [
      { title: "Campos — PeladaPro" },
      { name: "description", content: "Reserve sub-campos por hora com pagamento seguro." },
    ],
  }),
  component: CamposPage,
});

type Venue = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  bio: string | null;
  photo_url: string | null;
};

type SubField = {
  id: string;
  venue_id: string;
  name: string;
  field_type: "society" | "areia" | "sintetico" | "salao";
  price_per_hour: number;
  available_days: string[];
  available_times: string[];
  pricing_rules: PricingRule[];
  photo_url: string | null;
  active: boolean;
};

const TYPE_LABEL: Record<SubField["field_type"], string> = {
  society: "Society",
  areia: "Areia",
  sintetico: "Sintético",
  salao: "Salão",
};

function CamposPage() {
  const { session, activeProfile } = useAuth();
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("venues")
      .select("id, name, city, address, bio, photo_url")
      .order("name")
      .then(({ data }) => {
        setVenues((data ?? []) as Venue[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return venues.filter((v) => {
      if (q && !v.name.toLowerCase().includes(q) && !(v.address ?? "").toLowerCase().includes(q)) return false;
      if (city && !(v.city ?? "").toLowerCase().includes(city.toLowerCase())) return false;
      return true;
    });
  }, [venues, query, city]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">Campos</h1>
        <p className="text-sm text-muted-foreground">
          Escolha um estabelecimento, depois um campo e horário. Pagamento processado na hora.
        </p>
      </div>

      <Card className="border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome do estabelecimento ou endereço..."
              className="pl-9"
            />
          </div>
          <div className="sm:w-60">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center p-10 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Nenhum estabelecimento encontrado.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((v) => (
            <VenueCard key={v.id} venue={v} onOpen={() => setSelectedVenue(v)} />
          ))}
        </div>
      )}

      <Dialog open={!!selectedVenue} onOpenChange={(o) => !o && setSelectedVenue(null)}>
        <DialogContent className="max-w-3xl">
          {selectedVenue && (
            <VenueSubFields
              venue={selectedVenue}
              onClose={() => setSelectedVenue(null)}
              authed={!!session}
              canBook={activeProfile?.type === "player" || activeProfile?.type === "team"}
              onLogin={() => {
                setSelectedVenue(null);
                navigate({ to: "/auth", search: { redirect: "/campos" } });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VenueCard({ venue, onOpen }: { venue: Venue; onOpen: () => void }) {
  return (
    <Card className="overflow-hidden border-border bg-card p-0">
      <div className="relative h-28 bg-gradient-primary/40">
        {venue.photo_url ? (
          <img src={venue.photo_url} alt={venue.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/60">
            <Building2 className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="font-display text-lg uppercase tracking-wide">{venue.name}</div>
        {venue.address && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <span className="line-clamp-2">{venue.address}</span>
          </div>
        )}
        <Button onClick={onOpen} variant="outline" size="sm" className="w-full">
          Ver campos disponíveis <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}

function VenueSubFields({
  venue,
  onClose,
  authed,
  canBook,
  onLogin,
}: {
  venue: Venue;
  onClose: () => void;
  authed: boolean;
  canBook: boolean;
  onLogin: () => void;
}) {
  const [subFields, setSubFields] = useState<SubField[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SubField | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("sub_fields")
      .select("id, venue_id, name, field_type, price_per_hour, available_days, available_times, pricing_rules, photo_url, active")
      .eq("venue_id", venue.id)
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        setSubFields((data ?? []) as SubField[]);
        setLoading(false);
      });
  }, [venue.id]);

  const startCheckout = () => {
    if (!authed) return onLogin();
    if (!canBook) {
      toast.error("Apenas perfis Jogador ou Time podem reservar.");
      return;
    }
    if (!selected || !date || !time) {
      toast.error("Selecione campo, data e horário.");
      return;
    }
    setShowCheckout(true);
  };

  const scheduledAt = useMemo(() => {
    if (!date || !time) return "";
    return new Date(`${date}T${time}:00`).toISOString();
  }, [date, time]);

  if (showCheckout && selected && scheduledAt) {
    return (
      <div>
        <DialogHeader>
          <DialogTitle className="font-display uppercase">Pagamento · {selected.name}</DialogTitle>
          <DialogDescription>
            R$ {Number(selected.price_per_hour).toFixed(2)} · {date} {time}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <BookingStripeCheckout subFieldId={selected.id} scheduledAt={scheduledAt} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DialogHeader>
        <DialogTitle className="font-display uppercase tracking-wide">{venue.name}</DialogTitle>
        <DialogDescription>
          {venue.address ?? "Selecione um campo e horário disponível."}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center p-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : subFields.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface/30 p-6 text-center text-sm text-muted-foreground">
            Este estabelecimento ainda não cadastrou campos.
          </div>
        ) : (
          subFields.map((sf) => {
            const isSelected = selected?.id === sf.id;
            return (
              <button
                key={sf.id}
                type="button"
                onClick={() => { setSelected(sf); setTime(""); }}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-display text-base uppercase tracking-wide">{sf.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="outline">{TYPE_LABEL[sf.field_type]}</Badge>
                      {sf.available_days.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {sf.available_days.length} dias/sem
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-muted-foreground">R$/h</div>
                    <div className="font-display text-xl text-primary">
                      {Number(sf.price_per_hour).toFixed(0)}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Data</Label>
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">
                        <Clock className="mr-1 inline h-3 w-3" /> Horário
                      </Label>
                      {sf.available_times.length > 0 ? (
                        <select
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                        >
                          <option value="">Escolha</option>
                          {sf.available_times.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      ) : (
                        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
        <div className="text-sm text-muted-foreground">
          {selected && date && time
            ? <>Total: <strong className="text-primary">R$ {Number(selected.price_per_hour).toFixed(2)}</strong></>
            : "Escolha campo, data e horário"}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={startCheckout}
            disabled={!selected || !date || !time}
            className="bg-gradient-primary text-primary-foreground"
          >
            Reservar e pagar
          </Button>
        </div>
      </div>
    </div>
  );
}
