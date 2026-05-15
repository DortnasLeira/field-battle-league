import type { Achievement } from "./achievements";

// 10 conquistas para perfil de ÁRBITRO
export const REFEREE_ACHIEVEMENTS: Achievement[] = [
  { id: "ref_certified", title: "Apito oficial", description: "Conclua o cadastro como árbitro no PeladaPro", emoji: "🟨", unlocked: true },
  { id: "ref_first_hire", title: "Primeira contratação", description: "Receba sua primeira contratação", emoji: "🤝", unlocked: true },
  { id: "ref_first_game", title: "Bola rolando", description: "Apite o seu primeiro jogo", emoji: "⚽", unlocked: true },
  { id: "ref_first_signed", title: "Súmula assinada", description: "Assine sua primeira súmula digital", emoji: "📝", unlocked: true },
  { id: "ref_10_games", title: "Veterano do apito", description: "Apite 10 jogos pelo aplicativo", emoji: "🔟", unlocked: false },
  { id: "ref_50_games", title: "Casca grossa", description: "Apite 50 jogos pelo aplicativo", emoji: "💪", unlocked: false },
  { id: "ref_100_games", title: "Centurião", description: "Apite 100 jogos pelo aplicativo", emoji: "💯", unlocked: false },
  { id: "ref_5_star", title: "Imparcial", description: "Receba uma avaliação 5 estrelas após uma partida", emoji: "⭐", unlocked: true },
  { id: "ref_silver_tier", title: "Categoria Prata", description: "Atinja o nível Prata (Regional)", emoji: "🥈", unlocked: false },
  { id: "ref_gold_tier", title: "Categoria Ouro", description: "Atinja o nível Ouro (Nacional/Federado)", emoji: "🥇", unlocked: false },
];
