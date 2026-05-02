import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Star, Calendar, Clock, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";

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
  const { fields } = useStore();
  const [query, setQuery] = useState("");
  const [surface, setSurface] = useState<string>("all");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [onlyAvail, setOnlyAvail] = useState(false);

  const filtered = fields.filter((f) => {
    const matchQ = !query || f.name.toLowerCase().includes(query.toLowerCase()) || f.address.toLowerCase().includes(query.toLowerCase());
    const matchS = surface === "all" || f.surface === surface;
    const matchCity = !city || f.address.toLowerCase().includes(city.toLowerCase());
    const matchPrice = !priceMax || f.pricePerHour <= Number(priceMax);
    const matchSlots =
      (!date && !timeFrom && !timeTo && !onlyAvail) ||
      f.slots.some((s) => {
        if (date && s.date !== date) return false;
        if (timeFrom && s.time < timeFrom) return false;
        if (timeTo && s.time > timeTo) return false;
        if (onlyAvail && !s.available) return false;
        return true;
      });
    return matchQ && matchS && matchCity && matchPrice && matchSlots;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">Buscar Campo</h1>
        <p className="text-sm text-muted-foreground">Reserve um horário e desafie outros times.</p>
      </div>

      <Card className="border-border bg-card p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-10" placeholder="Nome do campo ou endereço..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input placeholder="Cidade / bairro" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} title="Data" />
          <Input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} title="A partir de" />
          <Input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} title="Até" />
          <Input type="number" placeholder="Preço máx (R$)" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} />
          Apenas com horários disponíveis
        </label>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((f) => (
          <FieldCard key={f.id} fieldId={f.id} />
        ))}
      </div>
    </div>
  );
}

function FieldCard({ fieldId }: { fieldId: string }) {
  const { fields, reserveSlot } = useStore();
  const { session } = useAuth();
  const navigate = useNavigate();
  const field = fields.find((f) => f.id === fieldId)!;
  const requireLogin = () => {
    toast.error("Faça login para reservar.");
    navigate({ to: "/auth" });
  };

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
            <Clock className="h-3 w-3" /> Horários disponíveis
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {field.slots.slice(0, 6).map((slot) => (
              <button
                key={slot.date + slot.time}
                disabled={!slot.available}
                onClick={() => {
                  if (!session) return requireLogin();
                  reserveSlot(field.id, slot.date, slot.time);
                  toast.success(`Reserva confirmada em ${field.name} — ${slot.date} ${slot.time}`);
                }}
                className={`rounded-md border px-2 py-1.5 text-[11px] font-medium transition ${
                  slot.available
                    ? "border-border bg-surface hover:border-primary hover:bg-primary/10 hover:text-primary"
                    : "cursor-not-allowed border-border/50 bg-surface/30 text-muted-foreground/50 line-through"
                }`}
              >
                <div className="font-mono">{new Date(slot.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>
                <div className="font-bold">{slot.time}</div>
              </button>
            ))}
          </div>
        </div>

        {session ? (
          <ChallengeDialog fieldId={field.id} />
        ) : (
          <Button onClick={requireLogin} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Calendar className="mr-2 h-4 w-4" /> Lançar batalha (login)
          </Button>
        )}
      </div>
    </Card>
  );
}

function ChallengeDialog({ fieldId }: { fieldId: string }) {
  const { teams, currentTeamId, fields, createChallenge } = useStore();
  const field = fields.find((f) => f.id === fieldId)!;
  const [open, setOpen] = useState(false);
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");

  const opponents = teams.filter((t) => t.id !== currentTeamId);
  const availableSlots = field.slots.filter((s) => s.available);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
          <Calendar className="mr-2 h-4 w-4" /> Lançar batalha aqui
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display uppercase">Lançar Batalha · {field.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Adversário</Label>
            <Select value={opponent} onValueChange={setOpponent}>
              <SelectTrigger><SelectValue placeholder="Escolha um time" /></SelectTrigger>
              <SelectContent>
                {opponents.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.shield} {t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Horário</Label>
            <Select value={date + "_" + time} onValueChange={(v) => { const [d, t] = v.split("_"); setDate(d); setTime(t); }}>
              <SelectTrigger><SelectValue placeholder="Escolha data e horário" /></SelectTrigger>
              <SelectContent>
                {availableSlots.map((s) => (
                  <SelectItem key={s.date + s.time} value={s.date + "_" + s.time}>
                    {new Date(s.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} · {s.time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 200))} placeholder="Bora marcar uma..." />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!opponent || !date || !time}
            className="bg-gradient-primary text-primary-foreground"
            onClick={() => {
              createChallenge({ fromTeamId: currentTeamId, toTeamId: opponent, fieldId, date, time, message: message || "Vamos jogar!" });
              toast.success("Desafio enviado! 🔥");
              setOpen(false);
              setOpponent(""); setDate(""); setTime(""); setMessage("");
            }}
          >
            Enviar desafio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
