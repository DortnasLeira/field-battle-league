-- Add new account types
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'business_field';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'business_referee';