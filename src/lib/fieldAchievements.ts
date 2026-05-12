export type FieldAchievement = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  progress: number; // 0..1
  current: number;
  target: number;
  /** Human-readable text describing what is still missing to unlock. */
  remaining: string;
};

export type FieldStats = {
  fieldsCount: number;
  bookingsConfirmed: number;
  hasPricingRule: boolean;
  daysCovered: Set<string>;
  saturdaySlotsTotal: number;
  saturdayBookingsConfirmed: number;
  verified: boolean;
  hasFiveStarReview: boolean;
};

const ALL_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABEL: Record<string, string> = {
  mon: "Seg", tue: "Ter", wed: "Qua", thu: "Qui", fri: "Sex", sat: "Sáb", sun: "Dom",
};

type Computer = (s: FieldStats) => { current: number; target: number; remaining: string };

const DEFS: (Omit<FieldAchievement, "unlocked" | "progress" | "current" | "target" | "remaining"> & {
  compute: Computer;
})[] = [
  {
    id: "first_field", title: "De portas abertas", emoji: "🏟️",
    description: "Cadastre o primeiro campo no complexo",
    compute: (s) => ({
      current: Math.min(s.fieldsCount, 1), target: 1,
      remaining: s.fieldsCount >= 1 ? "Concluída." : "Cadastre 1 campo no complexo.",
    }),
  },
  {
    id: "multi_field", title: "Arena completa", emoji: "🏗️",
    description: "Tenha 3 ou mais campos cadastrados",
    compute: (s) => ({
      current: Math.min(s.fieldsCount, 3), target: 3,
      remaining: s.fieldsCount >= 3 ? "Concluída." : `Faltam ${3 - s.fieldsCount} campo(s).`,
    }),
  },
  {
    id: "first_booking", title: "Bola rolando", emoji: "⚽",
    description: "Receba a primeira reserva confirmada",
    compute: (s) => ({
      current: Math.min(s.bookingsConfirmed, 1), target: 1,
      remaining: s.bookingsConfirmed >= 1 ? "Concluída." : "Aguarde a 1ª reserva confirmada.",
    }),
  },
  {
    id: "ten_bookings", title: "Casa cheia", emoji: "🔥",
    description: "Receba 10 reservas confirmadas",
    compute: (s) => ({
      current: Math.min(s.bookingsConfirmed, 10), target: 10,
      remaining: s.bookingsConfirmed >= 10
        ? "Concluída."
        : `Faltam ${10 - s.bookingsConfirmed} reserva(s) confirmada(s).`,
    }),
  },
  {
    id: "hundred_bookings", title: "Templo do futebol", emoji: "👑",
    description: "Receba 100 reservas confirmadas",
    compute: (s) => ({
      current: Math.min(s.bookingsConfirmed, 100), target: 100,
      remaining: s.bookingsConfirmed >= 100
        ? "Concluída."
        : `Faltam ${100 - s.bookingsConfirmed} reserva(s) confirmada(s).`,
    }),
  },
  {
    id: "prime_time", title: "Horário nobre", emoji: "💎",
    description: "Configure ao menos uma regra de precificação dinâmica",
    compute: (s) => ({
      current: s.hasPricingRule ? 1 : 0, target: 1,
      remaining: s.hasPricingRule
        ? "Concluída."
        : "Configure 1 regra de horário nobre em um campo.",
    }),
  },
  {
    id: "all_week", title: "Sete dias por semana", emoji: "📅",
    description: "Tenha disponibilidade configurada em todos os dias",
    compute: (s) => {
      const missing = ALL_DAYS.filter((d) => !s.daysCovered.has(d));
      return {
        current: 7 - missing.length, target: 7,
        remaining: missing.length === 0
          ? "Concluída."
          : `Adicione disponibilidade em: ${missing.map((d) => DAY_LABEL[d]).join(", ")}.`,
      };
    },
  },
  {
    id: "five_stars", title: "Avaliação máxima", emoji: "⭐",
    description: "Receba uma avaliação 5 estrelas de um time",
    compute: (s) => ({
      current: s.hasFiveStarReview ? 1 : 0, target: 1,
      remaining: s.hasFiveStarReview
        ? "Concluída."
        : "Aguarde uma avaliação 5 estrelas de algum time.",
    }),
  },
  {
    id: "verified_venue", title: "Selo de qualidade", emoji: "✅",
    description: "Tenha o estabelecimento verificado pela equipe PeladaPro",
    compute: (s) => ({
      current: s.verified ? 1 : 0, target: 1,
      remaining: s.verified
        ? "Concluída."
        : "Solicite verificação à equipe PeladaPro.",
    }),
  },
  {
    id: "weekend_king", title: "Dono do fim de semana", emoji: "🏆",
    description: "Lote todos os horários de um sábado",
    compute: (s) => {
      const target = Math.max(s.saturdaySlotsTotal, 1);
      const current = Math.min(s.saturdayBookingsConfirmed, target);
      const done = s.saturdaySlotsTotal > 0 && s.saturdayBookingsConfirmed >= s.saturdaySlotsTotal;
      return {
        current, target,
        remaining: done
          ? "Concluída."
          : s.saturdaySlotsTotal === 0
          ? "Adicione horários de sábado em algum campo."
          : `Faltam ${s.saturdaySlotsTotal - s.saturdayBookingsConfirmed} reserva(s) de sábado.`,
      };
    },
  },
];

export function computeFieldAchievements(stats: FieldStats): FieldAchievement[] {
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

// Backwards-compat
export const FIELD_ACHIEVEMENTS: FieldAchievement[] = computeFieldAchievements({
  fieldsCount: 0,
  bookingsConfirmed: 0,
  hasPricingRule: false,
  daysCovered: new Set(),
  saturdaySlotsTotal: 0,
  saturdayBookingsConfirmed: 0,
  verified: false,
  hasFiveStarReview: false,
});
