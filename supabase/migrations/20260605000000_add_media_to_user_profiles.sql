-- Adiciona suporte a capa e galeria de fotos nos perfis
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}';

-- Comentários para documentação
COMMENT ON COLUMN user_profiles.cover_url IS 'URL da foto de capa do perfil';
COMMENT ON COLUMN user_profiles.gallery_urls IS 'Lista de URLs para a galeria de fotos (máx 10)';
