import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Cidades brasileiras normalizadas no formato "Cidade/UF" (ex: "São Paulo/SP").
 * Carregadas da API pública do IBGE e cacheadas em localStorage por 30 dias.
 */

type IbgeMunicipio = {
  nome: string;
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
};

type CityOption = { label: string; search: string };

const CACHE_KEY = "peladapro:br-cities:v1";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
let memoryCache: CityOption[] | null = null;
let inflight: Promise<CityOption[]> | null = null;

function stripDiacritics(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeCity(value: string | null | undefined): string {
  if (!value) return "";
  return stripDiacritics(value).toLowerCase().replace(/[\s\-/_,]+/g, "");
}

async function loadCities(): Promise<CityOption[]> {
  if (memoryCache) return memoryCache;
  if (inflight) return inflight;

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; data: CityOption[] };
        if (Date.now() - parsed.at < CACHE_TTL_MS && Array.isArray(parsed.data)) {
          memoryCache = parsed.data;
          return memoryCache;
        }
      }
    } catch {
      /* ignore */
    }
  }

  inflight = (async () => {
    const res = await fetch(
      "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome",
    );
    if (!res.ok) throw new Error("Falha ao carregar cidades do IBGE");
    const data = (await res.json()) as IbgeMunicipio[];
    const list: CityOption[] = data
      .map((m) => {
        const uf = m.microrregiao?.mesorregiao?.UF?.sigla ?? "";
        const label = uf ? `${m.nome}/${uf}` : m.nome;
        return { label, search: stripDiacritics(label).toLowerCase() };
      })
      .filter((o) => o.label);
    memoryCache = list;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: list }));
    } catch {
      /* quota — ignora */
    }
    return list;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

interface CityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function CityCombobox({
  value,
  onChange,
  placeholder = "Selecione a cidade",
  className,
  disabled,
  id,
}: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<CityOption[]>(memoryCache ?? []);
  const [loading, setLoading] = useState(!memoryCache);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (memoryCache) return;
    let cancelled = false;
    setLoading(true);
    loadCities()
      .then((list) => {
        if (!cancelled) setCities(list);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = stripDiacritics(query).toLowerCase().trim();
    const source = q ? cities.filter((c) => c.search.includes(q)) : cities;
    return source.slice(0, 80);
  }, [cities, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          ref={triggerRef}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{value || placeholder}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] border-border/60 bg-[#11171c] p-0 text-foreground"
        align="start"
      >
        <Command
          shouldFilter={false}
          className="bg-[#11171c] text-foreground"
        >
          <CommandInput
            placeholder="Buscar cidade ou UF..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando cidades...
              </div>
            )}
            {error && !loading && (
              <div className="px-3 py-4 text-sm text-destructive">{error}</div>
            )}
            {!loading && !error && (
              <>
                <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                <CommandGroup>
                  {filtered.map((c) => (
                    <CommandItem
                      key={c.label}
                      value={c.label}
                      onSelect={() => {
                        onChange(c.label);
                        setOpen(false);
                        setQuery("");
                      }}
                      className="text-foreground data-[selected=true]:bg-[#f84713] data-[selected=true]:text-white aria-selected:bg-[#f84713] aria-selected:text-white"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === c.label ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {c.label}
                    </CommandItem>
                  ))}
                  {filtered.length === 80 && (
                    <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                      Refine a busca para ver mais resultados…
                    </div>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
