# Spec — Descoberta de Catálogo & Redesign Editorial

> **Status:** Aprovada (design) — aguardando plano de implementação
> **Data:** 2026-06-13
> **Iniciativa:** coesa, implementada em fases
> **Relacionado:** Fase 9 (catálogo WinGet) — [tracker](../../PROJECT-TRACKER.md)

## Contexto

O WinStack tem **13.249 pacotes** no banco, mas a descoberta e o visual estão aquém:

- **Taxonomia rasa:** `mapTagsToCategories` (em `scripts/sync-winget/parse-manifest.ts`) mapeia só ~30 tags para ~7-9 categorias. Resultado: apenas ~2.4k pacotes categorizados.
- **Filtros limitados:** loja só tem categoria, publisher e ordenação (`relevance`/`name`/`recent`).
- **UI com "cara de IA":** texto com gradiente indigo→violeta, glassmorphism (`.glass-card`), glow colorido por categoria (`.glow-hover`, `--glow-color`), blobs de blur, ponto "ping", badge "Reimagined.", 7 cores neon por categoria.
- **Páginas de conteúdo ausentes:** rodapé aponta "Sobre / Privacidade / Termos" todos para `/help`; essas páginas não existem.
- **Copy inconsistente:** inglês fixo no código misturado com i18n (ex.: "Windows Setup Reimagined", "Learn how it works" na Home).

## Objetivo

Transformar o WinStack numa loja de catálogo **descoberta-first** com identidade visual **editorial, minimalista e claramente feita por humanos** — ampliando cobertura de categorias, enriquecendo filtros e reescrevendo o sistema de design e a copy.

## Decisões aprovadas

| Tema | Decisão |
|---|---|
| Escopo | Iniciativa coesa única, em 5 fases |
| Taxonomia | Mapa **plano** com ~22 categorias de topo + dicionário multi-sinal |
| Cobertura | Meta ~80%+; pacotes sem categoria permanecem buscáveis (sem categoria "Outros") |
| Filtros novos | Multi-categoria, atualizados recentemente, licença (agrupada) |
| Direção visual | **Editorial / quente** (papel off-white, serifa nos títulos, muito respiro) |
| Acento | **Oliva/floresta** (clareado no escuro) |
| Tema | Claro + **escuro quente** (carvão amadeirado, não slate) |
| Fonte títulos | **Fraunces** (via `next/font/google`) + Geist sans no corpo |
| Layout loja | Sidebar de filtros fixa (desktop) / drawer (mobile) + grade + chips ativos |
| Home | Hero editorial + seção **"Kits populares"** (substitui terminal com glow) |
| Voz | Calorosa, editorial, primeira pessoa ("nós"); enquadramento indie/open-source |
| Páginas novas | Sobre, Privacidade, Termos, FAQ (própria) |
| Copy | Reescrita completa no novo tom + i18n PT/EN corrigido (sem inglês solto) |

---

## 1 · Taxonomia (cobertura ampla)

### Categorias de topo (~22, planas)

`developer-tools`, `programming-languages`, `productivity`, `office-documents`, `utilities`, `system-drivers`, `security-privacy`, `networking`, `multimedia`, `audio-music`, `video`, `graphics-design`, `photography`, `games`, `browsers`, `communication`, `social`, `email`, `cloud-storage`, `file-management`, `education`, `terminal-shell`.

> A lista final pode ser ajustada no plano, mas o teto é ~22 para manter navegação simples.

### Classificador multi-sinal

Substitui o `TAG_CATEGORY_MAP` atual por um classificador que, em ordem de prioridade, avalia:

1. **Tags** do manifest (dicionário ampliado de keywords → categoria).
2. **Moniker / nome** do pacote (tokens).
3. **Descrição** (palavras-chave).
4. **Heurística de publisher** (ex.: publishers conhecidos de jogos, navegadores).

Regras:
- Continua **vocabulário controlado** — só emite categorias da lista oficial; nunca usa a tag crua como categoria.
- Um pacote pode ter múltiplas categorias (`categories text[]`).
- Sem fallback "Outros": pacote não classificado fica com `categories = {}` e continua aparecendo em busca e em "Todas as categorias".

### Onde roda

- **Sync futuro:** `parse-manifest.ts` usa o novo classificador.
- **Backfill:** script único (`scripts/backfill-categories.*`) que reprocessa os 13k já existentes a partir de tags/nome/descrição persistidos, sem esperar re-sync. Atualiza `categories` em batches via service role.

### Critério de sucesso

- ≥ 80% dos 13.249 pacotes com ao menos 1 categoria.
- Nenhuma categoria fora do vocabulário oficial aparece no filtro.

---

## 2 · Filtros

### Dimensões

| Filtro | Mecanismo | Notas |
|---|---|---|
| Multi-categoria | `overlaps(categories, [...])` | URL `?category=dev-tools,browsers` (CSV); "qualquer uma" |
| Atualizados recentemente | faixa sobre `release_date` | select: último mês / 3 meses / ano |
| Licença | nova coluna `license_group` | `open-source` / `proprietary` / `unknown` |
| Publisher | `eq` (existente) | mantém |
| Ordenação | existente | relevância / nome / recente |

### Licença agrupada

- Nova coluna `license_group text` em `packages`, indexada.
- Mapa curado SPDX/keywords → grupo (ex.: `MIT`, `GPL*`, `Apache*`, `BSD*`, "open source" → `open-source`; "proprietary", "commercial", EULA → `proprietary`; vazio/desconhecido → `unknown`).
- Preenchida no sync (`parse-manifest.ts` passa a extrair `License`) + backfill.

### UI

- **Sidebar fixa (desktop) / drawer (mobile):** grupos de Categorias (checkboxes multi), Licença, Atualização, Publisher.
- **Chips de filtros ativos** acima da grade, cada um removível, + "Limpar tudo".
- Estado dos filtros na URL (compartilhável, server-rendered).

### RPC / facetas

- `distinct_categories` e `distinct_publishers` mantidos.
- **Fase 5 (opcional):** RPC de facetas com contagem por categoria/licença para exibir números na sidebar.

---

## 3 · Sistema de design (editorial / oliva)

### Tokens (`src/app/globals.css`) — reescrita

**Claro:**
- `--background`: papel off-white quente (~`oklch(0.97 0.01 95)`)
- `--foreground`: quase-preto quente
- `--card`: creme levemente mais claro que o fundo
- `--primary` (acento): oliva/floresta (~`oklch(0.50 0.08 130)`)
- `--border`: linha fina quente; sem sombras coloridas

**Escuro quente:**
- `--background`: carvão amadeirado (~`oklch(0.18 0.012 70)`) — não slate
- `--primary`: oliva clareado (~`oklch(0.68 0.10 130)`)
- superfícies e bordas em tons quentes

**Tipografia & forma:**
- `--font-heading` → Fraunces; corpo Geist sans.
- Raio menor/sóbrio (~`0.375rem`).

### Remoções (anti-"IA")

Apagar do `globals.css` e dos componentes:
- `.glass-card`, `.glow-hover`, `--glow-color`, `.terminal-box` glow.
- Blobs de blur ambiente (`bg-primary/5 blur-3xl`).
- Texto com `bg-gradient-to-r ... bg-clip-text text-transparent`.
- Ponto "ping" e badge "Reimagined.".
- Mapas `GLOW_COLORS` / `CATEGORY_BG_CLASSES` (7 cores neon) no `package-card`.

### `package-card` editorial

- Card plano: borda fina, ícone, **nome em Fraunces**, publisher, badges discretas (borda/underline no acento), botão sólido oliva.
- Categoria diferenciada por **tipografia + ícone monocromático**, não por cor vibrante.

---

## 4 · Componentes e páginas

| Página/Componente | Mudança |
|---|---|
| Loja (`store/page.tsx`) | Sidebar de filtros + grade + chips + paginação sóbria |
| `store-filters.tsx` | Multi-categoria, licença, recente; checkboxes; chips |
| Home (`page.tsx`) | Hero editorial + seção "Kits populares" (remove terminal/glow) |
| `package-card.tsx` | Reescrita editorial (sem glow/neon) |
| `home-sections.tsx` | Chips → lista editorial |
| Header/Footer | Sem gradiente; nav tipográfica; links do rodapé reais + repo |
| Detalhe do pacote | Reskin tokens |
| Carrinho / "Meu Kit" (sidebar) | Reskin tokens |
| Bundles | Reskin tokens |
| Ajuda | Reskin + mover FAQ para página própria |
| `category-icon.tsx` | Mapa de ícones expandido p/ ~22 categorias (lucide mono) |

---

## 5 · Conteúdo, voz e i18n

- **Voz:** calorosa, editorial, primeira pessoa ("nós"); indie/open-source sem fins lucrativos.
- **Páginas novas** (`/[locale]/about`, `/privacy`, `/terms`, `/faq`), i18n PT/EN, layout editorial:
  - **Sobre:** o que é, por que existe, como funciona, open-source.
  - **Privacidade:** auth anônima, o que guardamos (favoritos, bundles, histórico de download), sem rastreio de terceiros.
  - **Termos:** uso, "sem garantias", responsabilidade do usuário ao executar scripts.
  - **FAQ:** página própria (conteúdo migrado da Ajuda + link).
- **Rodapé:** links para as páginas reais + repositório.
- **Copy:** reescrita no novo tom; **i18n corrigido** em `messages/pt-BR.json` e `messages/en.json` — remover todo inglês fixo no código (Home etc.).

---

## Faseamento

1. **Dados:** migration (`license_group` + índices), classificador multi-sinal + dicionário, extração de `License` no parser, backfill dos 13k.
2. **Filtros:** queries (`overlaps`, `license_group`, `release_date`), UI da sidebar, chips, estado na URL.
3. **Design system:** reescrita de tokens, Fraunces via `next/font`, remoção dos utilitários de glow/glass/gradiente.
4. **Componentes/páginas:** `package-card` → loja → home (kits populares) → header/footer → detalhe/carrinho/bundles/ajuda.
5. **Conteúdo & polish:** páginas Sobre/Privacidade/Termos/FAQ, reescrita de copy + i18n, facetas com contagem (opcional), acessibilidade (contraste do oliva claro/escuro), responsivo.

## Fora de escopo

- Filtro por tipo de instalador e por tag crua (avaliados e descartados nesta rodada).
- Subcategorias / taxonomia em dois níveis.
- Categoria-lixo "Outros".

## Riscos & mitigações

- **Cobertura da classificação < 80%:** iterar o dicionário; medir com query de contagem após backfill.
- **Cobertura de `license`/`release_date` parcial nos manifests:** grupo `unknown` e faixa "qualquer data" como padrão; filtros são opcionais, não escondem pacotes por falta de dado.
- **Contraste do acento oliva (acessibilidade):** validar AA em claro e escuro; ajustar luminância dos tokens se necessário.
- **Performance multi-categoria:** índice GIN em `categories` (verificar migration 001); `overlaps` usa GIN.
