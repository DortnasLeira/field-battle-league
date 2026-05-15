
-- Enum de tipo de perfil
CREATE TYPE public.profile_type AS ENUM ('player', 'team', 'field');

-- Tabela base de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfis específicos (jogador / time / campo) — usuário pode ter os 3
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.profile_type NOT NULL,
  name TEXT NOT NULL,
  nickname TEXT,
  bio TEXT,
  city TEXT,
  avatar TEXT,            -- emoji ou URL
  color TEXT NOT NULL DEFAULT '#F59E0B',
  frame TEXT NOT NULL DEFAULT 'classic', -- classic | gold | neon | fire | ice
  -- campos específicos (todos opcionais)
  position TEXT,          -- jogador
  level TEXT,             -- jogador/time
  founded INTEGER,        -- time
  capacity INTEGER,       -- campo
  field_type TEXT,        -- campo: society/futsal/campo
  price_per_hour NUMERIC, -- campo
  address TEXT,           -- campo
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, type)
);

-- Perfil ativo selecionado pelo usuário
CREATE TABLE public.active_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_profile ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY "Profiles são visíveis a autenticados"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuário insere próprio profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Usuário atualiza próprio profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_profiles policies
CREATE POLICY "Perfis visíveis a autenticados"
  ON public.user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuário gerencia próprios perfis - insert"
  ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário gerencia próprios perfis - update"
  ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuário gerencia próprios perfis - delete"
  ON public.user_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- active_profile policies
CREATE POLICY "Usuário lê próprio perfil ativo"
  ON public.active_profile FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuário define próprio perfil ativo - insert"
  ON public.active_profile FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário define próprio perfil ativo - update"
  ON public.active_profile FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Trigger: cria profile automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_user_profiles BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
