export type RefereeAchievement = {
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

export type RefereeStats = {
  isRegistered: boolean;
  firstHireReceived: boolean;
  gamesOfficiated: number;
  sumulasSigned: number;
  has5StarReview: boolean;
  tier: "Bronze" | "Prata" | "Ouro";
};

type Computer = (s: RefereeStats) => { current: number; target: number; remaining: string };

const DEFS: (Omit<RefereeAchievement, "unlocked" | "progress" | "current" | "target" | "remaining"> & {
  compute: Computer;
})[] = [
  {
    id: "ref_certified", title: "Apito oficial", description: "Conclua o cadastro como árbitro no PeladaPro", emoji: "🟨",
    compute: (s) => ({ current: s.isRegistered ? 1 : 0, target: 1, remaining: s.isRegistered ? "Concluída." : "Conclua seu cadastro." }),
  },
  {
    id: "ref_first_hire", title: "Primeira contratação", description: "Receba sua primeira contratação", emoji: "🤝",
    compute: (s) => ({ current: s.firstHireReceived ? 1 : 0, target: 1, remaining: s.firstHireReceived ? "Concluída." : "Aguarde a primeira contratação." }),
  },
  {
    id: "ref_first_game", title: "Bola rolando", description: "Apite o seu primeiro jogo", emoji: "⚽",
    compute: (s) => ({ current: Math.min(s.gamesOfficiated, 1), target: 1, remaining: s.gamesOfficiated >= 1 ? "Concluída." : "Apite 1 jogo." }),
  },
  {
    id: "ref_first_signed", title: "Súmula assinada", description: "Assine sua primeira súmula digital", emoji: "📝",
    compute: (s) => ({ current: Math.min(s.sumulasSigned, 1), target: 1, remaining: s.sumulasSigned >= 1 ? "Concluída." : "Assine 1 súmula." }),
  },
  {
    id: "ref_10_games", title: "Veterano do apito", description: "Apite 10 jogos pelo aplicativo", emoji: "🔟",
    compute: (s) => ({ current: Math.min(s.gamesOfficiated, 10), target: 10, remaining: s.gamesOfficiated >= 10 ? "Concluída." : `Faltam ${10 - s.gamesOfficiated} jogos.` }),
  },
  {
    id: "ref_50_games", title: "Casca grossa", description: "Apite 50 jogos pelo aplicativo", emoji: "💪",
    compute: (s) => ({ current: Math.min(s.gamesOfficiated, 50), target: 50, remaining: s.gamesOfficiated >= 50 ? "Concluída." : `Faltam ${50 - s.gamesOfficiated} jogos.` }),
  },
  {
    id: "ref_100_games", title: "Centurião", description: "Apite 100 jogos pelo aplicativo", emoji: "💯",
    compute: (s) => ({ current: Math.min(s.gamesOfficiated, 100), target: 100, remaining: s.gamesOfficiated >= 100 ? "Concluída." : `Faltam ${100 - s.gamesOfficiated} jogos.` }),
  },
  {
    id: "ref_5_star", title: "Imparcial", description: "Receba uma avaliação 5 estrelas após uma partida", emoji: "⭐",
    compute: (s) => ({ current: s.has5StarReview ? 1 : 0, target: 1, remaining: s.has5StarReview ? "Concluída." : "Aguarde uma avaliação 5 estrelas." }),
  },
  {
    id: "ref_silver_tier", title: "Categoria Prata", description: "Atinja o nível Prata (Regional)", emoji: "🥈",
    compute: (s) => ({ current: (s.tier === "Prata" || s.tier === "Ouro") ? 1 : 0, target: 1, remaining: (s.tier === "Prata" || s.tier === "Ouro") ? "Concluída." : "Suba para a Categoria Prata." }),
  },
  {
    id: "ref_gold_tier", title: "Categoria Ouro", description: "Atinja o nível Ouro (Nacional/Federado)", emoji: "🥇",
    compute: (s) => ({ current: s.tier === "Ouro" ? 1 : 0, target: 1, remaining: s.tier === "Ouro" ? "Concluída." : "Suba para a Categoria Ouro." }),
  },
];

export function computeRefereeAchievements(stats: RefereeStats): RefereeAchievement[] {
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
export const REFEREE_ACHIEVEMENTS: RefereeAchievement[] = computeRefereeAchievements({
  isRegistered: true,
  firstHireReceived: false,
  gamesOfficiated: 0,
  sumulasSigned: 0,
  has5StarReview: false,
  tier: "Bronze",
});

