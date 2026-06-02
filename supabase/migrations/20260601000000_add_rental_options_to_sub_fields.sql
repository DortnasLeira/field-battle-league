-- Adiciona colunas para controle de intervalo de aluguel e padrão de início de horário
ALTER TABLE sub_fields 
ADD COLUMN IF NOT EXISTS rental_interval INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS time_offset TEXT DEFAULT ':00';

-- Comentários para documentação
COMMENT ON COLUMN sub_fields.rental_interval IS 'Duração padrão do aluguel em horas (1 ou 2)';
COMMENT ON COLUMN sub_fields.time_offset IS 'Padrão de início do horário (:00 ou :30)';
