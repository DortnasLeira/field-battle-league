export type Team = {
  id: string;
  name: string;
  shield: string; // emoji
  captain: string;
  city: string;
  founded: number;
  preferredDays: string[]; // Mon, Tue...
  preferredTimes: string[]; // "19:00"
};

export type League = {
  id: string;
  name: string;
  region: string;
  season: string;
  teamIds: string[];
  startDate: string;
};

export type MatchStatus =
  | "scheduled"
  | "awaiting_score"
  | "awaiting_validation"
  | "awaiting_referee_signature"
  | "completed";

export type MatchGoal = { teamId: string; player: string; minute: number };
export type MatchCard = { teamId: string; player: string; type: "yellow" | "red"; minute: number };

export type Match = {
  id: string;
  leagueId: string;
  homeId: string;
  awayId: string;
  fieldId: string;
  date: string; // ISO
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  scoreSubmittedBy?: string; // teamId who submitted
  refereeId?: string;
  signedByReferee?: boolean;
  goals?: MatchGoal[];
  cards?: MatchCard[];
  signedAt?: string;
};

export type Field = {
  id: string;
  name: string;
  address: string;
  surface: "Grama" | "Sintético" | "Society";
  pricePerHour: number;
  rating: number;
  image: string; // gradient class
  slots: { date: string; time: string; available: boolean; reservedBy?: string }[];
};

export type ChallengeStatus = "pending" | "accepted" | "declined";

export type RefereeRequestStatus = "pending" | "accepted" | "declined";

export type ChallengeRefereeRequest = {
  refereeId: string;
  refereeName: string;
  pricePerGame: number;
  status: RefereeRequestStatus;
  requestedAt: string;
  decidedAt?: string;
  matchId?: string; // created when accepted, used to sign súmula
};

export type Challenge = {
  id: string;
  fromTeamId: string;
  toTeamId: string;
  fieldId: string;
  date: string;
  time: string;
  message: string;
  status: ChallengeStatus;
  refereeRequest?: ChallengeRefereeRequest;
};

export const CURRENT_TEAM_ID = "t1";

export type Position = "Goleiro" | "Zagueiro" | "Lateral" | "Volante" | "Meia" | "Atacante";
export const ALL_POSITIONS: Position[] = ["Goleiro", "Zagueiro", "Lateral", "Volante", "Meia", "Atacante"];

export type OpeningStatus = "open" | "filled" | "closed";

export type PositionOpening = {
  id: string;
  teamId: string;
  position: Position;
  slots: number; // quantas vagas
  level: "Iniciante" | "Intermediário" | "Avançado";
  description: string;
  createdAt: string;
  status: OpeningStatus;
};

export type ApplicationStatus = "pending" | "accepted" | "rejected";

export type PlayerApplication = {
  id: string;
  openingId: string;
  playerName: string;
  playerAge: number;
  playerPhone: string;
  experience: string;
  message: string;
  createdAt: string;
  status: ApplicationStatus;
};

export type RentalStatus = "pending" | "approved" | "declined" | "expired";

export type FieldRental = {
  id: string;
  fieldId: string;
  requesterType: "player" | "team";
  requesterId: string; // profile id
  requesterName: string;
  date: string;
  time: string;
  message: string;
  createdAt: string; // ISO
  expiresAt: string; // ISO (createdAt + 48h)
  status: RentalStatus;
};

export const teams: Team[] = [
  { id: "t1", name: "Leões da Vila", shield: "🦁", captain: "Você", city: "São Paulo", founded: 2018, preferredDays: ["Sáb", "Dom"], preferredTimes: ["18:00", "20:00"] },
  { id: "t2", name: "Águias FC", shield: "🦅", captain: "Carlos M.", city: "São Paulo", founded: 2015, preferredDays: ["Sex", "Sáb"], preferredTimes: ["19:00", "21:00"] },
  { id: "t3", name: "Tubarões United", shield: "🦈", captain: "Rafael S.", city: "São Paulo", founded: 2019, preferredDays: ["Qua", "Sáb"], preferredTimes: ["20:00"] },
  { id: "t4", name: "Lobos da Mooca", shield: "🐺", captain: "Diego F.", city: "São Paulo", founded: 2012, preferredDays: ["Dom"], preferredTimes: ["10:00", "16:00"] },
  { id: "t5", name: "Falcões Negros", shield: "🦇", captain: "Pedro L.", city: "São Paulo", founded: 2020, preferredDays: ["Sex"], preferredTimes: ["21:00"] },
  { id: "t6", name: "Touros do Norte", shield: "🐂", captain: "André B.", city: "São Paulo", founded: 2014, preferredDays: ["Sáb"], preferredTimes: ["17:00"] },
  { id: "t7", name: "Cobras FC", shield: "🐍", captain: "Lucas T.", city: "São Paulo", founded: 2017, preferredDays: ["Qui", "Sáb"], preferredTimes: ["20:00"] },
  { id: "t8", name: "Panteras", shield: "🐆", captain: "Marcelo P.", city: "São Paulo", founded: 2016, preferredDays: ["Dom"], preferredTimes: ["09:00", "15:00"] },
];

export const leagues: League[] = [
  {
    id: "l1",
    name: "Liga Central",
    region: "Zona Central — SP",
    season: "2026",
    teamIds: ["t1", "t2", "t3", "t4", "t5", "t6"],
    startDate: "2026-03-01",
  },
  {
    id: "l2",
    name: "Copa da Cidade",
    region: "São Paulo",
    season: "2026",
    teamIds: ["t2", "t4", "t7", "t8"],
    startDate: "2026-04-15",
  },
  {
    id: "l3",
    name: "Liga Norte",
    region: "Zona Norte — SP",
    season: "2026",
    teamIds: ["t6", "t7", "t8"],
    startDate: "2026-05-01",
  },
];

export const fields: Field[] = [
  {
    id: "f1",
    name: "Arena Central",
    address: "R. das Palmeiras, 230 — Centro",
    surface: "Sintético",
    pricePerHour: 280,
    rating: 4.8,
    image: "from-amber-500/30 to-orange-700/30",
    slots: [
      { date: "2026-05-02", time: "18:00", available: true },
      { date: "2026-05-02", time: "20:00", available: false, reservedBy: "t1" },
      { date: "2026-05-03", time: "16:00", available: true },
      { date: "2026-05-03", time: "19:00", available: true },
    ],
  },
  {
    id: "f2",
    name: "Campo Vila Nova",
    address: "Av. Brasil, 1500 — Vila Nova",
    surface: "Grama",
    pricePerHour: 350,
    rating: 4.6,
    image: "from-emerald-600/30 to-emerald-900/30",
    slots: [
      { date: "2026-05-02", time: "10:00", available: true },
      { date: "2026-05-02", time: "15:00", available: true },
      { date: "2026-05-03", time: "09:00", available: false, reservedBy: "t2" },
    ],
  },
  {
    id: "f3",
    name: "Society Park",
    address: "R. Aurora, 88 — Bela Vista",
    surface: "Society",
    pricePerHour: 220,
    rating: 4.4,
    image: "from-orange-600/30 to-red-800/30",
    slots: [
      { date: "2026-05-02", time: "19:00", available: true },
      { date: "2026-05-02", time: "21:00", available: true },
      { date: "2026-05-04", time: "20:00", available: true },
    ],
  },
  {
    id: "f4",
    name: "Estádio Municipal",
    address: "Pq. dos Esportes — Mooca",
    surface: "Grama",
    pricePerHour: 420,
    rating: 4.9,
    image: "from-yellow-500/30 to-amber-800/30",
    slots: [
      { date: "2026-05-03", time: "17:00", available: true },
      { date: "2026-05-04", time: "10:00", available: true },
    ],
  },
];

// Pre-generated matches with results so ranking has data
export const matches: Match[] = [
  // Liga Central — completed
  { id: "m1", leagueId: "l1", homeId: "t1", awayId: "t2", fieldId: "f1", date: "2026-04-05T18:00", status: "completed", homeScore: 3, awayScore: 1 },
  { id: "m2", leagueId: "l1", homeId: "t3", awayId: "t4", fieldId: "f2", date: "2026-04-06T15:00", status: "completed", homeScore: 2, awayScore: 2 },
  { id: "m3", leagueId: "l1", homeId: "t5", awayId: "t6", fieldId: "f3", date: "2026-04-07T20:00", status: "completed", homeScore: 0, awayScore: 4 },
  { id: "m4", leagueId: "l1", homeId: "t1", awayId: "t3", fieldId: "f1", date: "2026-04-12T18:00", status: "completed", homeScore: 2, awayScore: 0 },
  { id: "m5", leagueId: "l1", homeId: "t2", awayId: "t4", fieldId: "f4", date: "2026-04-13T17:00", status: "completed", homeScore: 1, awayScore: 1 },
  { id: "m6", leagueId: "l1", homeId: "t6", awayId: "t1", fieldId: "f2", date: "2026-04-14T20:00", status: "completed", homeScore: 1, awayScore: 3 },
  { id: "m7", leagueId: "l1", homeId: "t4", awayId: "t5", fieldId: "f3", date: "2026-04-19T19:00", status: "completed", homeScore: 2, awayScore: 1 },
  { id: "m8", leagueId: "l1", homeId: "t3", awayId: "t6", fieldId: "f1", date: "2026-04-20T18:00", status: "completed", homeScore: 0, awayScore: 0 },
  { id: "m9", leagueId: "l1", homeId: "t2", awayId: "t5", fieldId: "f4", date: "2026-04-21T17:00", status: "completed", homeScore: 4, awayScore: 2 },
  // Awaiting validation (você venceu, adversário precisa validar)
  { id: "m10", leagueId: "l1", homeId: "t1", awayId: "t4", fieldId: "f2", date: "2026-04-26T20:00", status: "awaiting_validation", homeScore: 2, awayScore: 1, scoreSubmittedBy: "t1" },
  // Awaiting score input
  { id: "m11", leagueId: "l1", homeId: "t1", awayId: "t5", fieldId: "f1", date: "2026-04-28T19:00", status: "awaiting_score" },
  // Próximas
  { id: "m12", leagueId: "l1", homeId: "t1", awayId: "t6", fieldId: "f3", date: "2026-05-10T20:00", status: "scheduled" },

  // Copa da Cidade
  { id: "m20", leagueId: "l2", homeId: "t2", awayId: "t7", fieldId: "f1", date: "2026-04-18T19:00", status: "completed", homeScore: 2, awayScore: 0 },
  { id: "m21", leagueId: "l2", homeId: "t4", awayId: "t8", fieldId: "f2", date: "2026-04-19T15:00", status: "completed", homeScore: 1, awayScore: 3 },
  { id: "m22", leagueId: "l2", homeId: "t8", awayId: "t2", fieldId: "f4", date: "2026-04-25T17:00", status: "completed", homeScore: 2, awayScore: 2 },
];

export const challenges: Challenge[] = [
  {
    id: "c1",
    fromTeamId: "t3",
    toTeamId: "t1",
    fieldId: "f1",
    date: "2026-05-10",
    time: "19:00",
    message: "Bora marcar uma revanche! 🔥",
    status: "pending",
  },
  {
    id: "c2",
    fromTeamId: "t5",
    toTeamId: "t1",
    fieldId: "f3",
    date: "2026-05-12",
    time: "21:00",
    message: "Desafio amistoso de meio de semana.",
    status: "pending",
  },
  {
    id: "c3",
    fromTeamId: "t1",
    toTeamId: "t7",
    fieldId: "f2",
    date: "2026-05-15",
    time: "20:00",
    message: "Confronto direto pelo G4.",
    status: "pending",
  },
  {
    id: "c4",
    fromTeamId: "t1",
    toTeamId: "t6",
    fieldId: "f4",
    date: "2026-05-08",
    time: "17:00",
    message: "Vamos decidir essa parada no gramado.",
    status: "accepted",
  },
];

export const positionOpenings: PositionOpening[] = [
  {
    id: "po1",
    teamId: "t1",
    position: "Goleiro",
    slots: 1,
    level: "Intermediário",
    description: "Precisamos de goleiro reserva para a Liga Central. Treinos quinta 20h.",
    createdAt: "2026-04-25",
    status: "open",
  },
  {
    id: "po2",
    teamId: "t1",
    position: "Atacante",
    slots: 2,
    level: "Avançado",
    description: "Buscamos atacantes velocistas para reforçar o ataque na reta final do campeonato.",
    createdAt: "2026-04-27",
    status: "open",
  },
  {
    id: "po3",
    teamId: "t2",
    position: "Volante",
    slots: 1,
    level: "Intermediário",
    description: "Volante marcador, disponibilidade aos sábados.",
    createdAt: "2026-04-20",
    status: "open",
  },
  {
    id: "po4",
    teamId: "t4",
    position: "Zagueiro",
    slots: 1,
    level: "Iniciante",
    description: "Time amador buscando zagueiro para completar elenco. Bom ambiente!",
    createdAt: "2026-04-22",
    status: "open",
  },
  {
    id: "po5",
    teamId: "t7",
    position: "Meia",
    slots: 1,
    level: "Avançado",
    description: "Meia armador criativo, joga aos domingos pela manhã.",
    createdAt: "2026-04-15",
    status: "open",
  },
];

export const playerApplications: PlayerApplication[] = [
  {
    id: "pa1",
    openingId: "po1",
    playerName: "Bruno Henrique",
    playerAge: 28,
    playerPhone: "(11) 98888-1111",
    experience: "5 anos como goleiro em times amadores da zona leste.",
    message: "Tenho disponibilidade total nas quintas e finais de semana.",
    createdAt: "2026-04-26",
    status: "pending",
  },
  {
    id: "pa2",
    openingId: "po1",
    playerName: "Tiago Almeida",
    playerAge: 31,
    playerPhone: "(11) 97777-2222",
    experience: "Ex-goleiro de base do clube local, 10 anos de experiência.",
    message: "Procuro time competitivo. Posso ajudar.",
    createdAt: "2026-04-28",
    status: "pending",
  },
  {
    id: "pa3",
    openingId: "po2",
    playerName: "Felipe Costa",
    playerAge: 24,
    playerPhone: "(11) 96666-3333",
    experience: "Atacante rápido, artilheiro da última temporada amadora.",
    message: "Quero somar! Disponível para treinos.",
    createdAt: "2026-04-28",
    status: "pending",
  },
];

export type RefereeTier = "Bronze" | "Prata" | "Ouro";

export type RefereeHire = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  hirerName: string;
  hirerType: "team" | "field";
  matchTitle: string;
  status: "completed" | "scheduled" | "cancelled";
  rating?: number;
};

export type Referee = {
  id: string;
  name: string;
  avatar: string;
  city: string;
  pricePerGame: number;
  score: number; // 0-5
  reviews: number;
  experienceYears: number;
  tier: RefereeTier; // Bronze (Iniciante) | Prata (Regional) | Ouro (Nacional/Federado)
  certifications: string[];
  availableDays: string[]; // YYYY-MM-DD
  availableTimes: string[]; // HH:mm
  bio: string;
  hireHistory: RefereeHire[];
};

export const referees: Referee[] = [
  { id: "r1", name: "Marcos Pereira", avatar: "🧑‍⚖️", city: "São Paulo", pricePerGame: 150, score: 4.9, reviews: 87, experienceYears: 12, tier: "Ouro", certifications: ["CBF", "FPF"], availableDays: ["2026-05-09","2026-05-10","2026-05-16"], availableTimes: ["18:00","20:00"], bio: "Árbitro federado, especialista em campeonatos amadores.", hireHistory: [
    { id: "h1", date: "2026-04-12", time: "18:00", hirerName: "Liga Central", hirerType: "team", matchTitle: "Leões da Vila × Águias FC", status: "completed", rating: 5 },
    { id: "h2", date: "2026-04-20", time: "20:00", hirerName: "Arena Central", hirerType: "field", matchTitle: "Final amador zona sul", status: "completed", rating: 4.8 },
    { id: "h3", date: "2026-05-09", time: "18:00", hirerName: "Tubarões United", hirerType: "team", matchTitle: "Desafio interclubes", status: "scheduled" },
  ] },
  { id: "r2", name: "Júlia Santos", avatar: "👩‍⚖️", city: "São Paulo", pricePerGame: 180, score: 4.8, reviews: 64, experienceYears: 8, tier: "Ouro", certifications: ["FPF"], availableDays: ["2026-05-08","2026-05-09","2026-05-15"], availableTimes: ["19:00","21:00"], bio: "Apito firme, foco em fair-play e ritmo de jogo.", hireHistory: [
    { id: "h4", date: "2026-04-15", time: "19:00", hirerName: "Lobos da Mooca", hirerType: "team", matchTitle: "Clássico da Mooca", status: "completed", rating: 4.9 },
  ] },
  { id: "r3", name: "Ricardo Alves", avatar: "🧑‍⚖️", city: "Guarulhos", pricePerGame: 120, score: 4.6, reviews: 42, experienceYears: 6, tier: "Prata", certifications: ["FPF"], availableDays: ["2026-05-10","2026-05-11"], availableTimes: ["10:00","16:00"], bio: "Disponível para finais de semana e ligas regionais.", hireHistory: [
    { id: "h5", date: "2026-04-18", time: "10:00", hirerName: "Society Park", hirerType: "field", matchTitle: "Torneio sub-30", status: "completed", rating: 4.6 },
  ] },
  { id: "r4", name: "Bruno Lima", avatar: "🧑‍⚖️", city: "Osasco", pricePerGame: 100, score: 4.3, reviews: 21, experienceYears: 3, tier: "Bronze", certifications: [], availableDays: ["2026-05-09","2026-05-12"], availableTimes: ["20:00","22:00"], bio: "Árbitro iniciante, peladas e amistosos.", hireHistory: [] },
  { id: "r5", name: "Patrícia Rocha", avatar: "👩‍⚖️", city: "São Paulo", pricePerGame: 200, score: 5.0, reviews: 132, experienceYears: 15, tier: "Ouro", certifications: ["CBF","FIFA"], availableDays: ["2026-05-15","2026-05-16","2026-05-17"], availableTimes: ["15:00","17:00","19:00"], bio: "Quadro CBF, experiência em torneios oficiais.", hireHistory: [
    { id: "h6", date: "2026-04-05", time: "17:00", hirerName: "Estádio Municipal", hirerType: "field", matchTitle: "Copa da Cidade — Semi", status: "completed", rating: 5 },
    { id: "h7", date: "2026-04-22", time: "15:00", hirerName: "Falcões Negros", hirerType: "team", matchTitle: "Decisão da chave", status: "completed", rating: 5 },
  ] },
  { id: "r6", name: "Felipe Andrade", avatar: "🧑‍⚖️", city: "São Bernardo", pricePerGame: 130, score: 4.4, reviews: 28, experienceYears: 5, tier: "Prata", certifications: ["FPF"], availableDays: ["2026-05-09","2026-05-10"], availableTimes: ["18:00","21:00"], bio: "Atende region ABC, society e campo.", hireHistory: [] },
];

export const REFEREE_TIER_INFO: Record<RefereeTier, { label: string; description: string; tokenClass: string }> = {
  Bronze: { label: "Bronze", description: "Iniciante — peladas e amistosos", tokenClass: "text-[color:var(--tier-bronze)] border-[color:var(--tier-bronze)]" },
  Prata: { label: "Prata", description: "Regional — ligas amadoras e torneios locais", tokenClass: "text-[color:var(--tier-silver)] border-[color:var(--tier-silver)]" },
  Ouro: { label: "Ouro", description: "Nacional / Federado — CBF, FPF, FIFA", tokenClass: "text-[color:var(--tier-gold)] border-[color:var(--tier-gold)]" },
};
