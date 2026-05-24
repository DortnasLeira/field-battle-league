## Problema

Nos cartões de time em `/buscar`, o componente `<TeamBadge size="md" />` renderiza escudo + nome + cidade. Logo ao lado, o cartão também renderiza nome (em caixa alta) e cidade. Isso gera a duplicação que aparece no exemplo:

- Linha do TeamBadge: `🦁 Leões da Vila / São Paulo`
- Linhas do cartão: `LEÕES DA VILA` + `São Paulo · 100% em 2026 · Desde 2018`

## Solução

Em `src/routes/buscar.tsx`, dentro do mapeamento dos times (≈ linha 274), trocar `<TeamBadge teamId={t.id} size="md" />` por apenas o quadrado do escudo (mesmo visual do `TeamBadge`, sem o bloco de texto ao lado). As demais linhas do cartão (nome em caixa alta, cidade · aproveitamento · desde, nota · campo, botões Perfil/Desafiar) permanecem inalteradas.

Mudança mínima — não tocar em `TeamBadge.tsx` (é usado em outras telas onde o nome/cidade fazem sentido) nem em nenhum outro arquivo.

### Resultado por cartão

- 🦁 (escudo)
- LEÕES DA VILA
- São Paulo · 100% em 2026 · Desde 2018
- ⭐ 4.7 (58) · Arena Central
- [Perfil] [Desafiar]
