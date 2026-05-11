export type FieldAchievement = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
};

export type FieldStats = {
  fieldsCount: number;
  bookingsConfirmed: number;
  hasPricingRule: boolean;
  daysCovered: Set<string>; // union de available_days
  saturdaySlotsTotal: number;
  saturdayBookingsConfirmed: number;
  verified: boolean;
  hasFiveStarReview: boolean;
};

const DEFS: Omit<FieldAchievement, "unlocked">[] = [
  { id: "first_field", title: "De portas abertas", description: "Cadastre o primeiro campo no complexo", emoji: "🏟️" },
  { id: "multi_field", title: "Arena completa", description: "Tenha 3 ou mais campos cadastrados", emoji: "🏗️" },
  { id: "first_booking", title: "Bola rolando", description: "Receba a primeira reserva confirmada", emoji: "⚽" },
  { id: "ten_bookings", title: "Casa cheia", description: "Receba 10 reservas confirmadas", emoji: "🔥" },
  { id: "hundred_bookings", title: "Templo do futebol", description: "Receba 100 reservas confirmadas", emoji: "👑" },
  { id: "prime_time", title: "Horário nobre", description: "Configure ao menos uma regra de precificação dinâmica", emoji: "💎" },
  { id: "all_week", title: "Sete dias por semana", description: "Tenha disponibilidade configurada em todos os dias", emoji: "📅" },
  { id: "five_stars", title: "Avaliação máxima", description: "Receba uma avaliação 5 estrelas de um time", emoji: "⭐" },
  { id: "verified_venue", title: "Selo de qualidade", description: "Tenha o estabelecimento verificado pela equipe PeladaPro", emoji: "✅" },
  { id: "weekend_king", title: "Dono do fim de semana", description: "Lote todos os horários de um sábado", emoji: "🏆" },
];

export function computeFieldAchievements(stats: FieldStats): FieldAchievement[] {
  const allDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const checks: Record<string, boolean> = {
    first_field: stats.fieldsCount >= 1,
    multi_field: stats.fieldsCount >= 3,
    first_booking: stats.bookingsConfirmed >= 1,
    ten_bookings: stats.bookingsConfirmed >= 10,
    hundred_bookings: stats.bookingsConfirmed >= 100,
    prime_time: stats.hasPricingRule,
    all_week: allDays.every((d) => stats.daysCovered.has(d)),
    five_stars: stats.hasFiveStarReview,
    verified_venue: stats.verified,
    weekend_king:
      stats.saturdaySlotsTotal > 0 && stats.saturdayBookingsConfirmed >= stats.saturdaySlotsTotal,
  };
  return DEFS.map((d) => ({ ...d, unlocked: !!checks[d.id] }));
}

// Backwards-compat: lista estática com tudo bloqueado, usada como fallback
export const FIELD_ACHIEVEMENTS: FieldAchievement[] = DEFS.map((d) => ({ ...d, unlocked: false }));
