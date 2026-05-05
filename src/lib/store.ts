import { create } from "zustand";
import {
  type Challenge,
  type Field,
  type League,
  type Match,
  type Team,
  type PositionOpening,
  type PlayerApplication,
  type OpeningStatus,
  type FieldRental,
  CURRENT_TEAM_ID,
  challenges as initialChallenges,
  fields as initialFields,
  leagues as initialLeagues,
  matches as initialMatches,
  teams as initialTeams,
  positionOpenings as initialOpenings,
  playerApplications as initialApplications,
} from "./mockData";

type State = {
  currentTeamId: string;
  teams: Team[];
  leagues: League[];
  matches: Match[];
  fields: Field[];
  challenges: Challenge[];
  openings: PositionOpening[];
  applications: PlayerApplication[];
  rentals: FieldRental[];
  // actions
  joinLeague: (leagueId: string, teamId: string) => void;
  leaveLeague: (leagueId: string, teamId: string) => void;
  submitScore: (matchId: string, home: number, away: number, byTeamId: string) => void;
  validateScore: (matchId: string) => void;
  rejectScore: (matchId: string) => void;
  acceptChallenge: (challengeId: string) => void;
  declineChallenge: (challengeId: string) => void;
  createChallenge: (c: Omit<Challenge, "id" | "status">) => void;
  reserveSlot: (fieldId: string, date: string, time: string) => void;
  updateTeamPrefs: (teamId: string, days: string[], times: string[]) => void;
  createOpening: (o: Omit<PositionOpening, "id" | "createdAt" | "status">) => void;
  setOpeningStatus: (openingId: string, status: OpeningStatus) => void;
  deleteOpening: (openingId: string) => void;
  applyToOpening: (a: Omit<PlayerApplication, "id" | "createdAt" | "status">) => void;
  acceptApplication: (applicationId: string) => void;
  rejectApplication: (applicationId: string) => void;
  createLeague: (l: { name: string; region: string; season: string; startDate: string }) => void;
  requestRental: (r: Omit<FieldRental, "id" | "createdAt" | "expiresAt" | "status">) => void;
  approveRental: (id: string) => void;
  declineRental: (id: string) => void;
  expireOldRentals: () => void;
};

export const useStore = create<State>((set) => ({
  currentTeamId: CURRENT_TEAM_ID,
  teams: initialTeams,
  leagues: initialLeagues,
  matches: initialMatches,
  fields: initialFields,
  challenges: initialChallenges,
  openings: initialOpenings,
  applications: initialApplications,
  rentals: [],

  joinLeague: (leagueId, teamId) =>
    set((s) => ({
      leagues: s.leagues.map((l) =>
        l.id === leagueId && !l.teamIds.includes(teamId)
          ? { ...l, teamIds: [...l.teamIds, teamId] }
          : l,
      ),
    })),

  leaveLeague: (leagueId, teamId) =>
    set((s) => ({
      leagues: s.leagues.map((l) =>
        l.id === leagueId ? { ...l, teamIds: l.teamIds.filter((id) => id !== teamId) } : l,
      ),
    })),

  submitScore: (matchId, home, away, byTeamId) =>
    set((s) => ({
      matches: s.matches.map((m) =>
        m.id === matchId
          ? { ...m, homeScore: home, awayScore: away, scoreSubmittedBy: byTeamId, status: "awaiting_validation" }
          : m,
      ),
    })),

  validateScore: (matchId) =>
    set((s) => ({
      matches: s.matches.map((m) => (m.id === matchId ? { ...m, status: "completed" } : m)),
    })),

  rejectScore: (matchId) =>
    set((s) => ({
      matches: s.matches.map((m) =>
        m.id === matchId
          ? { ...m, status: "awaiting_score", homeScore: undefined, awayScore: undefined, scoreSubmittedBy: undefined }
          : m,
      ),
    })),

  acceptChallenge: (challengeId) =>
    set((s) => ({
      challenges: s.challenges.map((c) =>
        c.id === challengeId ? { ...c, status: "accepted" } : c,
      ),
    })),

  declineChallenge: (challengeId) =>
    set((s) => ({
      challenges: s.challenges.map((c) =>
        c.id === challengeId ? { ...c, status: "declined" } : c,
      ),
    })),

  createChallenge: (c) =>
    set((s) => ({
      challenges: [
        ...s.challenges,
        { ...c, id: `c${Date.now()}`, status: "pending" },
      ],
    })),

  reserveSlot: (fieldId, date, time) =>
    set((s) => ({
      fields: s.fields.map((f) =>
        f.id === fieldId
          ? {
              ...f,
              slots: f.slots.map((sl) =>
                sl.date === date && sl.time === time
                  ? { ...sl, available: false, reservedBy: s.currentTeamId }
                  : sl,
              ),
            }
          : f,
      ),
    })),

  updateTeamPrefs: (teamId, days, times) =>
    set((s) => ({
      teams: s.teams.map((t) =>
        t.id === teamId ? { ...t, preferredDays: days, preferredTimes: times } : t,
      ),
    })),

  createOpening: (o) =>
    set((s) => ({
      openings: [
        {
          ...o,
          id: `po${Date.now()}`,
          createdAt: new Date().toISOString().slice(0, 10),
          status: "open",
        },
        ...s.openings,
      ],
    })),

  setOpeningStatus: (openingId, status) =>
    set((s) => ({
      openings: s.openings.map((o) => (o.id === openingId ? { ...o, status } : o)),
    })),

  deleteOpening: (openingId) =>
    set((s) => ({
      openings: s.openings.filter((o) => o.id !== openingId),
      applications: s.applications.filter((a) => a.openingId !== openingId),
    })),

  applyToOpening: (a) =>
    set((s) => ({
      applications: [
        ...s.applications,
        {
          ...a,
          id: `pa${Date.now()}`,
          createdAt: new Date().toISOString().slice(0, 10),
          status: "pending",
        },
      ],
    })),

  acceptApplication: (applicationId) =>
    set((s) => {
      const app = s.applications.find((a) => a.id === applicationId);
      if (!app) return {};
      const opening = s.openings.find((o) => o.id === app.openingId);
      const acceptedCount =
        s.applications.filter((x) => x.openingId === app.openingId && x.status === "accepted").length + 1;
      const filled = !!opening && acceptedCount >= opening.slots;
      const newStatus: OpeningStatus = filled ? "filled" : opening?.status ?? "open";
      return {
        applications: s.applications.map((x) => {
          if (x.id === applicationId) return { ...x, status: "accepted" };
          // Quando a vaga é preenchida, recusa automaticamente os demais pendentes
          if (filled && x.openingId === app.openingId && x.status === "pending") {
            return { ...x, status: "rejected" };
          }
          return x;
        }),
        openings: s.openings.map((o) => (o.id === app.openingId ? { ...o, status: newStatus } : o)),
      };
    }),

  rejectApplication: (applicationId) =>
    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === applicationId ? { ...a, status: "rejected" } : a,
      ),
    })),

  createLeague: (l) =>
    set((s) => ({
      leagues: [
        ...s.leagues,
        { id: `l${Date.now()}`, name: l.name, region: l.region, season: l.season, startDate: l.startDate, teamIds: [] },
      ],
    })),

  requestRental: (r) => {
    const now = new Date();
    const exp = new Date(now.getTime() + 48 * 3600 * 1000);
    set((s) => ({
      rentals: [
        {
          ...r,
          id: `r${Date.now()}`,
          createdAt: now.toISOString(),
          expiresAt: exp.toISOString(),
          status: "pending",
        },
        ...s.rentals,
      ],
    }));
  },

  approveRental: (id) =>
    set((s) => {
      const r = s.rentals.find((x) => x.id === id);
      if (!r) return {};
      return {
        rentals: s.rentals.map((x) => (x.id === id ? { ...x, status: "approved" } : x)),
        fields: s.fields.map((f) =>
          f.id === r.fieldId
            ? {
                ...f,
                slots: f.slots.map((sl) =>
                  sl.date === r.date && sl.time === r.time
                    ? { ...sl, available: false, reservedBy: r.requesterId }
                    : sl,
                ),
              }
            : f,
        ),
      };
    }),

  declineRental: (id) =>
    set((s) => ({
      rentals: s.rentals.map((x) => (x.id === id ? { ...x, status: "declined" } : x)),
    })),

  expireOldRentals: () => {
    const now = Date.now();
    set((s) => ({
      rentals: s.rentals.map((r) =>
        r.status === "pending" && new Date(r.expiresAt).getTime() < now
          ? { ...r, status: "expired" }
          : r,
      ),
    }));
  },
}));

export type StandingRow = {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  pct: number;
};

export function computeStandings(leagueId: string, matches: Match[], teamIds: string[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  teamIds.forEach((id) =>
    rows.set(id, {
      teamId: id,
      played: 0, wins: 0, draws: 0, losses: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0, pct: 0,
    }),
  );

  matches
    .filter((m) => m.leagueId === leagueId && m.status === "completed" && m.homeScore != null && m.awayScore != null)
    .forEach((m) => {
      const home = rows.get(m.homeId);
      const away = rows.get(m.awayId);
      if (!home || !away) return;
      home.played++; away.played++;
      home.goalsFor += m.homeScore!; home.goalsAgainst += m.awayScore!;
      away.goalsFor += m.awayScore!; away.goalsAgainst += m.homeScore!;
      if (m.homeScore! > m.awayScore!) { home.wins++; home.points += 3; away.losses++; }
      else if (m.homeScore! < m.awayScore!) { away.wins++; away.points += 3; home.losses++; }
      else { home.draws++; away.draws++; home.points++; away.points++; }
    });

  const out = Array.from(rows.values()).map((r) => ({
    ...r,
    goalDiff: r.goalsFor - r.goalsAgainst,
    pct: r.played ? Math.round((r.points / (r.played * 3)) * 100) : 0,
  }));

  out.sort((a, b) =>
    b.points - a.points ||
    b.wins - a.wins ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor,
  );
  return out;
}
