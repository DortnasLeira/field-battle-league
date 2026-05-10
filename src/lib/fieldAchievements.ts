export type FieldAchievement = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
};

// Mock — futuramente conectado ao histórico real do estabelecimento
export const FIELD_ACHIEVEMENTS: FieldAchievement[] = [
  { id: "first_field", title: "De portas abertas", description: "Cadastre o primeiro campo no complexo", emoji: "🏟️", unlocked: true },
  { id: "multi_field", title: "Arena completa", description: "Tenha 3 ou mais campos cadastrados", emoji: "🏗️", unlocked: false },
  { id: "first_booking", title: "Bola rolando", description: "Receba a primeira reserva confirmada", emoji: "⚽", unlocked: true },
  { id: "ten_bookings", title: "Casa cheia", description: "Receba 10 reservas confirmadas", emoji: "🔥", unlocked: true },
  { id: "hundred_bookings", title: "Templo do futebol", description: "Receba 100 reservas confirmadas", emoji: "👑", unlocked: false },
  { id: "prime_time", title: "Horário nobre", description: "Configure ao menos uma regra de precificação dinâmica", emoji: "💎", unlocked: true },
  { id: "all_week", title: "Sete dias por semana", description: "Tenha disponibilidade configurada em todos os dias", emoji: "📅", unlocked: false },
  { id: "five_stars", title: "Avaliação máxima", description: "Receba uma avaliação 5 estrelas de um time", emoji: "⭐", unlocked: false },
  { id: "verified_venue", title: "Selo de qualidade", description: "Tenha o estabelecimento verificado pela equipe PeladaPro", emoji: "✅", unlocked: false },
  { id: "weekend_king", title: "Dono do fim de semana", description: "Lote todos os horários de um sábado", emoji: "🏆", unlocked: false },
];
