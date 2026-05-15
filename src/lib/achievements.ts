export type Achievement = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
};

// Mock — futuramente ligado a estatísticas reais do jogador
export const PLAYER_ACHIEVEMENTS: Achievement[] = [
  { id: "first_goal", title: "Sorte de principiante", description: "Faça seu primeiro gol", emoji: "⚽", unlocked: true },
  { id: "hat_trick", title: "Hat-trick", description: "Faça 3 gols em uma única partida", emoji: "🎩", unlocked: true },
  { id: "first_match", title: "O nascimento de uma lenda", description: "Jogue sua primeira partida pelo aplicativo", emoji: "🌱", unlocked: true },
  { id: "ten_matches", title: "A lenda continua", description: "Jogue 10 partidas pelo aplicativo", emoji: "🔥", unlocked: true },
  { id: "hundred_matches", title: "Lenda das lendas", description: "Jogue 100 partidas pelo aplicativo", emoji: "👑", unlocked: false },
  { id: "first_save", title: "Vai que é sua", description: "Faça sua primeira defesa difícil", emoji: "🧤", unlocked: false },
  { id: "own_goal", title: "Nem tudo são flores", description: "Faça um gol contra", emoji: "😅", unlocked: false },
  { id: "mvp", title: "Uma máquina", description: "Seja eleito o melhor jogador da partida", emoji: "🏅", unlocked: true },
];

// Quais conquistas desbloqueiam cada moldura
export const FRAME_UNLOCK: Record<string, { requires: string[]; label: string } > = {
  classic: { requires: [], label: "Sempre disponível" },
  gold: { requires: ["hat_trick"], label: "Desbloqueia com Hat-trick" },
  neon: { requires: ["mvp"], label: "Desbloqueia com Uma máquina" },
  fire: { requires: ["ten_matches"], label: "Desbloqueia com A lenda continua" },
  ice: { requires: ["hundred_matches"], label: "Desbloqueia com Lenda das lendas" },
};

export function isFrameUnlocked(frameId: string, achievements: Achievement[] = PLAYER_ACHIEVEMENTS) {
  const reqs = FRAME_UNLOCK[frameId]?.requires ?? [];
  return reqs.every((id) => achievements.find((a) => a.id === id)?.unlocked);
}
