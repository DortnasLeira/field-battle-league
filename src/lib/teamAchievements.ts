import type { Achievement } from "./achievements";

// 20 conquistas para perfil de TIME
export const TEAM_ACHIEVEMENTS: Achievement[] = [
  { id: "team_founded", title: "Nasce uma lenda", description: "Crie o time no PeladaPro", emoji: "🛡️", unlocked: true },
  { id: "team_first_member", title: "Primeira contratação", description: "Adicione o primeiro jogador ao elenco", emoji: "🤝", unlocked: true },
  { id: "team_squad_11", title: "Onze fechado", description: "Tenha 11 jogadores no elenco", emoji: "🧩", unlocked: true },
  { id: "team_squad_22", title: "Banco reforçado", description: "Tenha 22 jogadores no elenco", emoji: "🪑", unlocked: false },
  { id: "team_first_match", title: "Primeira batalha", description: "Dispute a primeira partida pelo aplicativo", emoji: "⚔️", unlocked: true },
  { id: "team_first_win", title: "Estreia vitoriosa", description: "Vença a primeira partida", emoji: "🥇", unlocked: true },
  { id: "team_clean_sheet", title: "Muralha", description: "Vença sem sofrer gols", emoji: "🧱", unlocked: true },
  { id: "team_goleada", title: "Goleada histórica", description: "Vença por 5 ou mais gols de diferença", emoji: "💥", unlocked: false },
  { id: "team_streak_3", title: "Embalou", description: "Vença 3 partidas seguidas", emoji: "🔥", unlocked: true },
  { id: "team_streak_5", title: "Pegando fogo", description: "Vença 5 partidas seguidas", emoji: "🚀", unlocked: false },
  { id: "team_streak_10", title: "Dinastia", description: "Vença 10 partidas seguidas", emoji: "👑", unlocked: false },
  { id: "team_10_matches", title: "Veterano", description: "Dispute 10 partidas", emoji: "📅", unlocked: true },
  { id: "team_50_matches", title: "Tradição", description: "Dispute 50 partidas", emoji: "📚", unlocked: false },
  { id: "team_100_matches", title: "Centenário", description: "Dispute 100 partidas", emoji: "💯", unlocked: false },
  { id: "team_first_challenge", title: "Joga limpo, joga forte", description: "Crie seu primeiro desafio público", emoji: "📣", unlocked: true },
  { id: "team_first_league", title: "Liga organizada", description: "Inscreva-se em uma liga", emoji: "🏟️", unlocked: false },
  { id: "team_league_champion", title: "Campeão de liga", description: "Conquiste o título de uma liga", emoji: "🏆", unlocked: false },
  { id: "team_fair_play", title: "Cavalheiros", description: "Mantenha 100% de Fair Play após 10 jogos", emoji: "🕊️", unlocked: true },
  { id: "team_5_star", title: "Avaliação máxima", description: "Receba uma avaliação 5 estrelas de um adversário", emoji: "⭐", unlocked: false },
  { id: "team_verified", title: "Time verificado", description: "Tenha o time verificado pela equipe PeladaPro", emoji: "✅", unlocked: false },
];
