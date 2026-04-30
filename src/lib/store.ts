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
      const newStatus: OpeningStatus =
        opening && acceptedCount >= opening.slots ? "filled" : opening?.status ?? "open";
      return {
        applications: s.applications.map((x) =>
          x.id === applicationId ? { ...x, status: "accepted" } : x,
        ),
        openings: s.openings.map((o) => (o.id === app.openingId ? { ...o, status: newStatus } : o)),
      };
    }),

  rejectApplication: (applicationId) =>
    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === applicationId ? { ...a, status: "rejected" } : a,
      ),
    })),
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
