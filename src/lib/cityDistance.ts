// Coordenadas aproximadas (lat, lng) das principais cidades brasileiras.
// Usado para o filtro de raio (km) na contratação de árbitros.
// Cidades fora desta lista só aparecem em correspondência exata por nome.
export const CITY_COORDS: Record<string, [number, number]> = {
  "são paulo": [-23.5505, -46.6333],
  "sao paulo": [-23.5505, -46.6333],
  "rio de janeiro": [-22.9068, -43.1729],
  "belo horizonte": [-19.9167, -43.9345],
  "brasília": [-15.7939, -47.8828],
  "brasilia": [-15.7939, -47.8828],
  "salvador": [-12.9714, -38.5014],
  "fortaleza": [-3.7172, -38.5433],
  "curitiba": [-25.4284, -49.2733],
  "manaus": [-3.119, -60.0217],
  "recife": [-8.0476, -34.8770],
  "porto alegre": [-30.0346, -51.2177],
  "goiânia": [-16.6869, -49.2648],
  "goiania": [-16.6869, -49.2648],
  "belém": [-1.4558, -48.5039],
  "belem": [-1.4558, -48.5039],
  "guarulhos": [-23.4628, -46.5333],
  "campinas": [-22.9099, -47.0626],
  "são luís": [-2.5307, -44.3068],
  "são gonçalo": [-22.8268, -43.0537],
  "maceió": [-9.6658, -35.7350],
  "duque de caxias": [-22.7858, -43.3057],
  "natal": [-5.7945, -35.2110],
  "teresina": [-5.0892, -42.8019],
  "campo grande": [-20.4697, -54.6201],
  "nova iguaçu": [-22.7556, -43.4603],
  "são bernardo do campo": [-23.6914, -46.5646],
  "joão pessoa": [-7.1195, -34.8450],
  "santo andré": [-23.6739, -46.5388],
  "osasco": [-23.5325, -46.7916],
  "jaboatão dos guararapes": [-8.1130, -35.0150],
  "ribeirão preto": [-21.1775, -47.8103],
  "uberlândia": [-18.9186, -48.2772],
  "sorocaba": [-23.5015, -47.4526],
  "contagem": [-19.9317, -44.0536],
  "aracaju": [-10.9472, -37.0731],
  "feira de santana": [-12.2663, -38.9663],
  "cuiabá": [-15.6014, -56.0979],
  "joinville": [-26.3045, -48.8487],
  "juiz de fora": [-21.7642, -43.3503],
  "londrina": [-23.3045, -51.1696],
  "florianópolis": [-27.5954, -48.5480],
  "niterói": [-22.8833, -43.1036],
  "porto velho": [-8.7619, -63.9039],
  "santos": [-23.9608, -46.3331],
  "ananindeua": [-1.3656, -48.3722],
  "vila velha": [-20.3299, -40.2925],
  "campos dos goytacazes": [-21.7545, -41.3244],
  "são josé dos campos": [-23.2237, -45.9009],
  "mauá": [-23.6678, -46.4613],
  "carapicuíba": [-23.5224, -46.8356],
  "olinda": [-8.0089, -34.8553],
  "blumenau": [-26.9194, -49.0661],
  "caxias do sul": [-29.1678, -51.1794],
  "vitória": [-20.3155, -40.3128],
  "vitoria": [-20.3155, -40.3128],
  "diadema": [-23.6864, -46.6228],
  "piracicaba": [-22.7253, -47.6492],
};

const normalize = (s: string) => s.trim().toLowerCase();

/** Remove sufixo "/UF" e normaliza para lookup no mapa de coordenadas. */
function stripUf(s: string) {
  return normalize(s).replace(/\s*\/\s*[a-z]{2}\s*$/i, "");
}

export function getCityCoords(city: string): [number, number] | null {
  if (!city) return null;
  return CITY_COORDS[normalize(city)] ?? CITY_COORDS[stripUf(city)] ?? null;
}

/** Extrai a sigla da UF de uma string no formato "Cidade/UF". */
export function getCityUF(city: string | null | undefined): string | null {
  if (!city) return null;
  const m = city.match(/\/\s*([a-zA-Z]{2})\s*$/);
  return m ? m[1].toUpperCase() : null;
}

/** Distância em km entre dois pontos (haversine). */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Retorna a distância em km entre duas cidades pelo nome, ou null se alguma
 * delas não estiver no mapa de coordenadas conhecidas.
 */
export function cityDistanceKm(cityA: string, cityB: string): number | null {
  const a = getCityCoords(cityA);
  const b = getCityCoords(cityB);
  if (!a || !b) return null;
  return haversineKm(a, b);
}
