import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Star, Calendar, Clock, Search, Inbox, Bell, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { FiltersPanel } from "@/components/FiltersPanel";

export const Route = createFileRoute("/campos")({
  head: () => ({
    meta: [
      { title: "Buscar campo — PeladaPro" },
      { name: "description", content: "Reserve campos próximos com horários disponíveis e dispare desafios." },
    ],
  }),
  component: CamposPage,
});

function CamposPage() {
  const { fields, rentals, expireOldRentals, approveRental, declineRental } = useStore();
  const { activeProfile } = useAuth();
  const [query, setQuery] = useState("");
  const [surface, setSurface] = useState<string>("all");
  const [city, setCity] = useState("");
  const [searchBy, setSearchBy] = useState<"date" | "time">("date");
  const [date, setDate] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [onlyAvail, setOnlyAvail] = useState(false);

  // Auto-expire old rental requests on mount + every minute
  useEffect(() => {
    expireOldRentals();
    const t = setInterval(expireOldRentals, 60_000);
    return () => clearInterval(t);
  }, [expireOldRentals]);

  const filterCount = [
    surface !== "all", city,
    searchBy === "date" ? date : (timeFrom || timeTo),
    priceMax, onlyAvail,
  ].filter(Boolean).length;

  const clear = () => {
    setQuery(""); setSurface("all"); setCity(""); setDate("");
    setTimeFrom(""); setTimeTo(""); setPriceMax(""); setOnlyAvail(false);
  };

  const slotMatches = (s: { date: string; time: string; available: boolean }) => {
    if (searchBy === "date" && date && s.date !== date) return false;
    if (searchBy === "time") {
      if (timeFrom && s.time < timeFrom) return false;
      if (timeTo && s.time > timeTo) return false;
    }
    if (onlyAvail && !s.available) return false;
    return true;
  };

  const filtered = fields.filter((f) => {
    const matchQ = !query || f.name.toLowerCase().includes(query.toLowerCase()) || f.address.toLowerCase().includes(query.toLowerCase());
    const matchS = surface === "all" || f.surface === surface;
    const matchCity = !city || f.address.toLowerCase().includes(city.toLowerCase());
    const matchPrice = !priceMax || f.pricePerHour <= Number(priceMax);
    const hasFilter = (searchBy === "date" && date) || (searchBy === "time" && (timeFrom || timeTo)) || onlyAvail;
    const matchSlots = !hasFilter || f.slots.some(slotMatches);
    return matchQ && matchS && matchCity && matchPrice && matchSlots;
  });

  const isField = activeProfile?.type === "field";
  const myFieldRentals = isField
    ? rentals // demo: campo logado vê todas as solicitações
    : [];
  const myRequests = activeProfile && !isField
    ? rentals.filter((r) => r.requesterId === activeProfile.id)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">Buscar Campo</h1>
        <p className="text-sm text-muted-foreground">Solicite uma reserva — o campo tem 48h para aprovar.</p>
      </div>

      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search">Buscar</TabsTrigger>
          {isField && (
            <TabsTrigger value="inbox">
              <Inbox className="mr-2 h-4 w-4" /> Solicitações
              {rentals.filter((r) => r.status === "pending").length > 0 && (
                <span className="ml-2 rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                  {rentals.filter((r) => r.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
          )}
          {!isField && activeProfile && (
            <TabsTrigger value="mine">
              <Bell className="mr-2 h-4 w-4" /> Minhas solicitações ({myRequests.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="search" className="mt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Digite o nome do campo ou endereço..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <FiltersPanel count={filterCount} onClear={clear}>
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Select value={surface} onValueChange={setSurface}>
                  <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os pisos</SelectItem>
                    <SelectItem value="Grama">Grama natural</SelectItem>
                    <SelectItem value="Sintético">Sintético</SelectItem>
                    <SelectItem value="Society">Society</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Input placeholder="Cidade / bairro" value={city} onChange={(e) => setCity(e.target.value)} />
                <Input type="number" placeholder="Preço máx (R$)" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
                <Select value={searchBy} onValueChange={(v) => setSearchBy(v as "date" | "time")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Buscar por data</SelectItem>
                    <SelectItem value="time">Buscar por horário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {searchBy === "date" ? (
                <div>
                  <Label className="text-xs text-muted-foreground">Data desejada</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:w-60" />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 sm:max-w-md">
                  <div>
                    <Label className="text-xs text-muted-foreground">A partir de</Label>
                    <Input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Até</Label>
                    <Input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} />
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} />
                Apenas com horários disponíveis
              </label>
            </div>
          </FiltersPanel>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((f) => (
              <FieldCard key={f.id} fieldId={f.id} />
            ))}
          </div>
        </TabsContent>

        {isField && (
          <TabsContent value="inbox" className="mt-6 space-y-3">
            {myFieldRentals.length === 0 && (
              <Card className="border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                Nenhuma solicitação por enquanto.
              </Card>
            )}
            {myFieldRentals.map((r) => (
              <RentalRow
                key={r.id}
                rental={r}
                onApprove={() => { approveRental(r.id); toast.success("Reserva aprovada!"); }}
                onDecline={() => { declineRental(r.id); toast("Reserva recusada."); }}
              />
            ))}
          </TabsContent>
        )}

        {!isField && activeProfile && (
          <TabsContent value="mine" className="mt-6 space-y-3">
            {myRequests.length === 0 && (
              <Card className="border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                Você ainda não solicitou nenhum campo.
              </Card>
            )}
            {myRequests.map((r) => (
              <RentalRow key={r.id} rental={r} />
            ))}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function RentalRow({
  rental,
  onApprove,
  onDecline,
}: {
  rental: ReturnType<typeof useStore.getState>["rentals"][number];
  onApprove?: () => void;
  onDecline?: () => void;
}) {
  const { fields } = useStore();
  const field = fields.find((f) => f.id === rental.fieldId);
  const remainingMs = new Date(rental.expiresAt).getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.floor(remainingMs / 3600000));

  const cfg = {
    pending: { label: `Pendente · ${hoursLeft}h restantes`, className: "border-warning/40 text-warning" },
    approved: { label: "Aprovada", className: "border-success/40 text-success" },
    declined: { label: "Recusada", className: "border-destructive/40 text-destructive" },
    expired: { label: "Expirada (48h sem resposta)", className: "border-muted text-muted-foreground" },
  }[rental.status];

  return (
    <Card className="border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-display text-base uppercase tracking-wide">{field?.name ?? "Campo"}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(rental.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} · {rental.time}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Solicitado por <strong className="text-foreground">{rental.requesterName}</strong>
            {" "}({rental.requesterType === "team" ? "Time" : "Jogador"})
          </div>
          {rental.message && <p className="mt-2 text-sm italic text-muted-foreground">"{rental.message}"</p>}
        </div>
        <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
      </div>
      {rental.status === "pending" && onApprove && onDecline && (
        <div className="mt-3 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onDecline}><X className="mr-1 h-4 w-4" /> Recusar</Button>
          <Button size="sm" className="bg-success text-success-foreground" onClick={onApprove}>
            <Check className="mr-1 h-4 w-4" /> Aprovar
          </Button>
        </div>
      )}
    </Card>
  );
}

function FieldCard({ fieldId }: { fieldId: string }) {
  const { fields } = useStore();
  const { session, activeProfile } = useAuth();
  const navigate = useNavigate();
  const field = fields.find((f) => f.id === fieldId)!;

  return (
    <Card className="overflow-hidden border-border bg-card p-0">
      <div className={`relative h-32 bg-gradient-to-br ${field.image} field-pattern flex items-end p-4`}>
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs backdrop-blur">
          <Star className="h-3 w-3 fill-primary text-primary" />
          <span className="stat-num font-bold">{field.rating}</span>
        </div>
        <h3 className="font-display text-xl uppercase tracking-wide text-foreground drop-shadow">{field.name}</h3>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{field.address}</span>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="outline">{field.surface}</Badge>
          <span className="font-mono text-sm">
            <span className="text-muted-foreground">R$ </span>
            <span className="text-base font-bold text-primary">{field.pricePerHour}</span>
            <span className="text-muted-foreground">/h</span>
          </span>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" /> Horários
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {field.slots.slice(0, 6).map((slot) => (
              <div
                key={slot.date + slot.time}
                className={`rounded-md border px-2 py-1.5 text-[11px] font-medium ${
                  slot.available
                    ? "border-border bg-surface"
                    : "border-border/50 bg-surface/30 text-muted-foreground/50 line-through"
                }`}
              >
                <div className="font-mono">{new Date(slot.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>
                <div className="font-bold">{slot.time}</div>
              </div>
            ))}
          </div>
        </div>

        {!session ? (
          <Button onClick={() => { toast.error("Faça login para alugar."); navigate({ to: "/auth" }); }} className="w-full bg-gradient-primary text-primary-foreground">
            <Calendar className="mr-2 h-4 w-4" /> Entrar para alugar
          </Button>
        ) : !activeProfile || activeProfile.type === "field" ? (
          <Button disabled variant="outline" className="w-full">
            Apenas Jogador ou Time pode alugar
          </Button>
        ) : (
          <RentalRequestDialog fieldId={field.id} />
        )}
      </div>
    </Card>
  );
}

function RentalRequestDialog({ fieldId }: { fieldId: string }) {
  const { fields, requestRental } = useStore();
  const { activeProfile } = useAuth();
  const field = fields.find((f) => f.id === fieldId)!;
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");

  const slots = useMemo(() => field.slots.filter((s) => s.available), [field.slots]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-primary text-primary-foreground">
          <Calendar className="mr-2 h-4 w-4" /> Solicitar reserva
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display uppercase">Solicitar · {field.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-warning/10 p-3 text-xs text-warning">
            ⏱️ O campo tem <strong>48 horas</strong> para aprovar. Sem resposta, a solicitação é recusada automaticamente.
          </div>
          <div>
            <Label>Data e horário disponível</Label>
            <Select value={date + "_" + time} onValueChange={(v) => { const [d, t] = v.split("_"); setDate(d); setTime(t); }}>
              <SelectTrigger><SelectValue placeholder="Escolha um horário" /></SelectTrigger>
              <SelectContent>
                {slots.map((s) => (
                  <SelectItem key={s.date + s.time} value={s.date + "_" + s.time}>
                    {new Date(s.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} · {s.time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mensagem (opcional)</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 200))} placeholder="Conta um pouco sobre o jogo..." />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!date || !time || !activeProfile}
            className="bg-gradient-primary text-primary-foreground"
            onClick={() => {
              if (!activeProfile) return;
              requestRental({
                fieldId,
                requesterType: activeProfile.type === "team" ? "team" : "player",
                requesterId: activeProfile.id,
                requesterName: activeProfile.name,
                date,
                time,
                message: message || "Solicitação de reserva.",
              });
              toast.success("Solicitação enviada! O campo tem 48h para responder.");
              setOpen(false);
              setDate(""); setTime(""); setMessage("");
            }}
          >
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
