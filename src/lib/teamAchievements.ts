export type TeamAchievement = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  progress: number;
  current: number;
  target: number;
  remaining: string;
};

export type TeamStats = {
  playersCount: number;
  matchesPlayed: number;
  wins: number;
  cleanSheets: number;
  maxGoalDiff: number;
  winStreak: number;
  challengesCreated: number;
  leaguesJoined: number;
  leagueTitles: number;
  fairPlay: number;
  has5StarReview: boolean;
  verified: boolean;
};

type Computer = (s: TeamStats) => { current: number; target: number; remaining: string };

const DEFS: (Omit<TeamAchievement, "unlocked" | "progress" | "current" | "target" | "remaining"> & {
  compute: Computer;
})[] = [
  {
    id: "team_founded", title: "Nasce uma lenda", description: "Crie o time no PeladaPro", emoji: "🛡️",
    compute: () => ({ current: 1, target: 1, remaining: "Concluída." }),
  },
  {
    id: "team_first_member", title: "Primeira contratação", description: "Adicione o primeiro jogador ao elenco", emoji: "🤝",
    compute: (s) => ({ current: Math.min(s.playersCount, 1), target: 1, remaining: s.playersCount >= 1 ? "Concluída." : "Adicione 1 jogador." }),
  },
  {
    id: "team_squad_11", title: "Onze fechado", description: "Tenha 11 jogadores no elenco", emoji: "🧩",
    compute: (s) => ({ current: Math.min(s.playersCount, 11), target: 11, remaining: s.playersCount >= 11 ? "Concluída." : `Faltam ${11 - s.playersCount} jogadores.` }),
  },
  {
    id: "team_squad_22", title: "Banco reforçado", description: "Tenha 22 jogadores no elenco", emoji: "🪑",
    compute: (s) => ({ current: Math.min(s.playersCount, 22), target: 22, remaining: s.playersCount >= 22 ? "Concluída." : `Faltam ${22 - s.playersCount} jogadores.` }),
  },
  {
    id: "team_first_match", title: "Primeira batalha", description: "Dispute a primeira partida pelo aplicativo", emoji: "⚔️",
    compute: (s) => ({ current: Math.min(s.matchesPlayed, 1), target: 1, remaining: s.matchesPlayed >= 1 ? "Concluída." : "Aguardando 1º jogo." }),
  },
  {
    id: "team_first_win", title: "Estreia vitoriosa", description: "Vença a primeira partida", emoji: "🥇",
    compute: (s) => ({ current: Math.min(s.wins, 1), target: 1, remaining: s.wins >= 1 ? "Concluída." : "Aguardando 1ª vitória." }),
  },
  {
    id: "team_clean_sheet", title: "Muralha", description: "Vença sem sofrer gols", emoji: "🧱",
    compute: (s) => ({ current: Math.min(s.cleanSheets, 1), target: 1, remaining: s.cleanSheets >= 1 ? "Concluída." : "Vença um jogo sem tomar gol." }),
  },
  {
    id: "team_goleada", title: "Goleada histórica", description: "Vença por 5 ou mais gols de diferença", emoji: "💥",
    compute: (s) => ({ current: Math.min(s.maxGoalDiff, 5), target: 5, remaining: s.maxGoalDiff >= 5 ? "Concluída." : "Consiga saldo de +5 em um jogo." }),
  },
  {
    id: "team_streak_3", title: "Embalou", description: "Vença 3 partidas seguidas", emoji: "🔥",
    compute: (s) => ({ current: Math.min(s.winStreak, 3), target: 3, remaining: s.winStreak >= 3 ? "Concluída." : `Faltam ${3 - s.winStreak} vitórias seguidas.` }),
  },
  {
    id: "team_streak_5", title: "Pegando fogo", description: "Vença 5 partidas seguidas", emoji: "🚀",
    compute: (s) => ({ current: Math.min(s.winStreak, 5), target: 5, remaining: s.winStreak >= 5 ? "Concluída." : `Faltam ${5 - s.winStreak} vitórias seguidas.` }),
  },
  {
    id: "team_streak_10", title: "Dinastia", description: "Vença 10 partidas seguidas", emoji: "👑",
    compute: (s) => ({ current: Math.min(s.winStreak, 10), target: 10, remaining: s.winStreak >= 10 ? "Concluída." : `Faltam ${10 - s.winStreak} vitórias seguidas.` }),
  },
  {
    id: "team_10_matches", title: "Veterano", description: "Dispute 10 partidas", emoji: "📅",
    compute: (s) => ({ current: Math.min(s.matchesPlayed, 10), target: 10, remaining: s.matchesPlayed >= 10 ? "Concluída." : `Faltam ${10 - s.matchesPlayed} partidas.` }),
  },
  {
    id: "team_50_matches", title: "Tradição", description: "Dispute 50 partidas", emoji: "📚",
    compute: (s) => ({ current: Math.min(s.matchesPlayed, 50), target: 50, remaining: s.matchesPlayed >= 50 ? "Concluída." : `Faltam ${50 - s.matchesPlayed} partidas.` }),
  },
  {
    id: "team_100_matches", title: "Centenário", description: "Dispute 100 partidas", emoji: "💯",
    compute: (s) => ({ current: Math.min(s.matchesPlayed, 100), target: 100, remaining: s.matchesPlayed >= 100 ? "Concluída." : `Faltam ${100 - s.matchesPlayed} partidas.` }),
  },
  {
    id: "team_first_challenge", title: "Joga limpo, joga forte", description: "Crie seu primeiro desafio público", emoji: "📣",
    compute: (s) => ({ current: Math.min(s.challengesCreated, 1), target: 1, remaining: s.challengesCreated >= 1 ? "Concluída." : "Crie 1 desafio." }),
  },
  {
    id: "team_first_league", title: "Liga organizada", description: "Inscreva-se em uma liga", emoji: "🏟️",
    compute: (s) => ({ current: Math.min(s.leaguesJoined, 1), target: 1, remaining: s.leaguesJoined >= 1 ? "Concluída." : "Inscreva-se em 1 liga." }),
  },
  {
    id: "team_league_champion", title: "Campeão de liga", description: "Conquiste o título de uma liga", emoji: "🏆",
    compute: (s) => ({ current: Math.min(s.leagueTitles, 1), target: 1, remaining: s.leagueTitles >= 1 ? "Concluída." : "Vença 1 liga." }),
  },
  {
    id: "team_fair_play", title: "Cavalheiros", description: "Mantenha 100% de Fair Play após 10 jogos", emoji: "🕊️",
    compute: (s) => ({ current: s.matchesPlayed >= 10 && s.fairPlay === 100 ? 1 : 0, target: 1, remaining: (s.matchesPlayed >= 10 && s.fairPlay === 100) ? "Concluída." : "Chegue a 10 jogos com 100% Fair Play." }),
  },
  {
    id: "team_5_star", title: "Avaliação máxima", description: "Receba uma avaliação 5 estrelas de um adversário", emoji: "⭐",
    compute: (s) => ({ current: s.has5StarReview ? 1 : 0, target: 1, remaining: s.has5StarReview ? "Concluída." : "Aguarde avaliação 5 estrelas." }),
  },
  {
    id: "team_verified", title: "Time verificado", description: "Tenha o time verificado pela equipe PeladaPro", emoji: "✅",
    compute: (s) => ({ current: s.verified ? 1 : 0, target: 1, remaining: s.verified ? "Concluída." : "Solicite verificação." }),
  },
];

export function computeTeamAchievements(stats: TeamStats): TeamAchievement[] {
  return DEFS.map((d) => {
    const { current, target, remaining } = d.compute(stats);
    const progress = target > 0 ? Math.min(1, current / target) : 0;
    return {
      id: d.id,
      title: d.title,
      description: d.description,
      emoji: d.emoji,
      current,
      target,
      progress,
      unlocked: progress >= 1,
      remaining,
    };
  });
}

// Backwards-compat default
export const TEAM_ACHIEVEMENTS: TeamAchievement[] = computeTeamAchievements({
  playersCount: 0,
  matchesPlayed: 0,
  wins: 0,
  cleanSheets: 0,
  maxGoalDiff: 0,
  winStreak: 0,
  challengesCreated: 0,
  leaguesJoined: 0,
  leagueTitles: 0,
  fairPlay: 100,
  has5StarReview: false,
  verified: false,
});
