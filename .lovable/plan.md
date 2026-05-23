## Reestruturação de tipos de conta

### Mudança principal
Hoje existem 2 tipos: `sportist` e `business` (esse abrange Campo e Árbitro). Vamos passar para 3:

- **Esportista** (`sportist`) — pode criar perfis de **Jogador** e **Time**
- **Business Campo** (`business_field`) — pode criar somente perfil de **Campo**
- **Business Árbitro** (`business_referee`) — pode criar somente perfil de **Árbitro**

Times continuam exclusivos de Esportista (já é o comportamento atual).

### Banco de dados (migração)
1. Adicionar valores `business_field` e `business_referee` ao enum `public.account_type`.
2. Migrar dados existentes em `user_account_types`:
   - usuários `business` que possuem perfil `referee` → `business_referee`
   - demais `business` (com perfil `field` ou sem perfis) → `business_field`
3. Atualizar funções/policies:
   - `enforce_profile_account_type`: nova lógica
     - `sportist` ⇒ `player` ou `team`
     - `business_field` ⇒ apenas `field`
     - `business_referee` ⇒ apenas `referee`
   - `is_business_account`: passa a retornar true para `business_field` OR `business_referee`
   - Policy `venues_insert_business`: aceitar `business_field` (em vez de `business`)
4. Manter `'business'` legado no enum por compatibilidade (sem remover, apenas parar de usar).

### Frontend
1. `src/lib/auth.tsx`:
   - `AccountType = 'sportist' | 'business_field' | 'business_referee'`
   - `ACCOUNT_TYPE_LABEL`: rótulos PT-BR ("Esportista", "Business Campo", "Business Árbitro")
   - `ALLOWED_PROFILE_TYPES`:
     - sportist: `['player', 'team']`
     - business_field: `['field']`
     - business_referee: `['referee']`
   - Tratar `account_type === 'business'` antigo lido do DB como `business_field` por segurança (fallback no client).
2. `src/routes/onboarding.tsx`:
   - `OPTIONS`: mapear cada perfil ao novo `account` correto
     - player → sportist, team → sportist, field → business_field, referee → business_referee
   - Mensagens de bloqueio usando os novos labels
3. Verificar usos de `accountType === 'business'` em todo o projeto e ajustar:
   - `Header`, `RefereeDashboard`, `complexo*`, `arbitragem*`, guards de rota, etc.
   - Substituir por checks específicos (`'business_field'` / `'business_referee'`) ou helper `isBusiness(accountType)`.

### Detalhes técnicos
- Adicionar valor a um enum Postgres exige `ALTER TYPE ... ADD VALUE` fora de bloco de transação — separar em statements simples.
- Não remover o valor `'business'` (Postgres não permite drop de enum value sem recriar o tipo); apenas migrar todas as linhas existentes.
- Após migração, types.ts será regenerado automaticamente.

### Arquivos a editar
- `supabase/migrations/...` (novo)
- `src/lib/auth.tsx`
- `src/routes/onboarding.tsx`
- Outros arquivos onde `'business'` aparece (ajuste pontual com grep)
