# EasyWinGet — Histórico do Projeto

> Log cronológico de decisões, sessões e entregas. **Append-only** — não apagar entradas antigas.

---

## 2026-06-11 — Brainstorming e Design Spec

**Feito:**
- Definido escopo: loja WinGet gratuita, pública, acessível (portfólio + ferramenta real)
- Escolhida **Abordagem 1**: Next.js (Vercel) + Supabase + GitHub Actions para sync do catálogo
- Requisitos confirmados:
  - Login anônimo com favoritos, bundles, histórico de downloads e links compartilháveis
  - Catálogo WinGet oficial (listas curadas/comunidade no futuro)
  - Script `.ps1` autocontido, auditável, com GUI WinForms na execução
  - i18n PT-BR + EN desde o v1
  - UI com shadcn/ui e foco em UX democrática/acessível
- Spec escrita e aprovada: `docs/superpowers/specs/2026-06-11-easywinget-design.md`

**Decisões:**
- Vercel não roda `winget` — catálogo indexado via GitHub Action → Supabase
- Mitigação MOTW: `Unblock-File`, página Ajuda, fluxo "Copiar script"
- Auth: `signInAnonymously()` do Supabase na primeira visita

**Próximo:**
- Plano de implementação MVP + sistema de rastreamento persistente

---

## 2026-06-11 — Plano de Implementação e Sistema de Rastreamento

**Feito:**
- Criado plano MVP: `docs/superpowers/plans/2026-06-11-easywinget-mvp.md`
- Criado board de progresso: `docs/PROJECT-TRACKER.md`
- Criada regra Cursor: `.cursor/rules/project-tracking.mdc` (atualização automática entre sessões)
- Criado este arquivo de histórico

**Decisões:**
- Tracker (`PROJECT-TRACKER.md`) é a fonte da verdade para progresso entre sessões
- Tarefas ad-hoc vão na seção **Backlog** do tracker
- Agentes devem ler tracker no início e atualizar tracker + HISTORY ao final de cada sessão

**Próximo:**
- Fase 0: Scaffold Next.js + shadcn + i18n (ver tracker)

---

## 2026-06-11 — Task 0.1: Scaffold Next.js 15

**Feito:**
- App Next.js 15.5.19 criado com App Router, TypeScript, Tailwind CSS v4, ESLint, `src/`, alias `@/*`
- Workaround: diretório raiz `EasyWinGet` tem maiúsculas (npm rejeita) — scaffold em subpasta temporária e movido para raiz
- `package.json` name ajustado para `easywinget`
- `npm run build` passou com sucesso (Turbopack)
- `docs/` e `.cursor/` preservados intactos

**Decisões:**
- Pinado `create-next-app@15` (não `@latest`, que resolve para v16)
- Tailwind CSS v4 veio no template padrão do Next 15.5

**Próximo:**
- Task 0.2: Configurar shadcn/ui

---

## 2026-06-11 — Task 0.2: shadcn/ui + tema claro/escuro

**Feito:**
- `npx shadcn@latest init -d` — preset base-nova, Tailwind v4, CSS variables oklch
- Componentes adicionados: button, input, card, badge, dialog, sheet, tabs, select, skeleton, dropdown-menu, command (+ textarea, input-group como deps)
- `next-themes` instalado; `ThemeProvider` com estratégia `class` em `layout.tsx`
- `globals.css`: font-size base 16px, `muted-foreground` ajustado para contraste WCAG AA
- `npm run build` passou

**Decisões:**
- Preset shadcn `base-nova` (Base UI + estilo Nova) — default do CLI com `-d`
- Tema escuro via classe `.dark` no `<html>`, não `prefers-color-scheme` sozinho

**Próximo:**
- Task 0.3: Instalar e configurar `next-intl`

---

## 2026-06-11 — Tasks 0.3 + 0.4: next-intl e mensagens base

**Feito:**
- Instalado `next-intl`; criados `src/i18n/routing.ts`, `request.ts`, `navigation.ts`
- `next.config.ts` com `createNextIntlPlugin`; `src/middleware.ts` com matcher excluindo api/_next/arquivos estáticos
- Páginas movidas para `src/app/[locale]/`; root layout passthrough; locale layout com ThemeProvider + NextIntlClientProvider
- Locales: `pt-BR` (default) e `en`, prefixo sempre (`/pt-BR`, `/en`)
- Criados `messages/pt-BR.json` e `messages/en.json` (26 chaves: nav, common, home, footer, meta)
- Home page usa `useTranslations` para title, subtitle e searchPlaceholder
- `npm run build` passou (rotas estáticas `/pt-BR` e `/en`)

**Decisões:**
- Códigos de locale `pt-BR` e `en` (spec), não `/pt` do plano
- `generateStaticParams` no locale layout para SSG das duas rotas

**Próximo:**
- Task 0.5: Layout raiz com header, footer, seletor de idioma

---

## 2026-06-11 — Tasks 0.5–0.7: Layout, README e env (Fase 0 completa)

**Feito:**
- Componentes de layout em `src/components/layout/`: `header.tsx`, `footer.tsx`, `locale-switcher.tsx`, `theme-toggle.tsx`
- Header com logo, nav i18n (home, store, cart, bundles, help), seletor PT-BR/EN preservando path, toggle claro/escuro
- Footer com links e copyright; acessibilidade: `nav` semântico, `aria-label`, `aria-current`, alvos de toque ≥44px
- Header + Footer integrados em `src/app/[locale]/layout.tsx` com `<main id="main-content">`
- Páginas placeholder: `/store`, `/cart`, `/bundles`, `/help` (componente `PlaceholderPage` + Card)
- Home atualizada com shadcn Card e botão "Começar" → loja
- Chaves i18n adicionadas: `header.*`, `locale.*`, `theme.*`, `pages.*`, `footer.navLabel`
- `README.md` substituído (PT primário + resumo EN): setup, stack, link ao tracker
- `.env.example` com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
- `npm run build` e `npm run lint` passaram (14 rotas estáticas)

**Decisões:**
- Footer links (Sobre/Privacidade/Termos) apontam para `/help` até páginas dedicadas existirem
- Locale switcher usa `router.replace(pathname, { locale })` do next-intl navigation

**Próximo:**
- Fase 1: Supabase — projeto, migrations, cliente SSR, auth anônima (task 1.1)

---

## 2026-06-11 — Configuração .env.local (Supabase)

**Feito:**
- Detectado projeto Supabase **EasyWinGet** já criado pelo usuário
- Arquivo `.env.local` criado na raiz do projeto com URL e anon key
- Arquivo está no `.gitignore` (não vai para o Git — seguro)

**Pendente (usuário):**
- Habilitar **Anonymous sign-ins** em: https://supabase.com/dashboard/project/yqhjscguprljiiajwncw/auth/providers

**Próximo:**
- Confirmar Anonymous Auth → marcar 1.1 completa → migrations 1.2–1.5

---

## 2026-06-11 — Fase 1 Supabase completa (execução inline)

**Feito:**
- Migrations 001–004 aplicadas no projeto remoto EasyWinGet
- `@supabase/ssr` instalado: client, server, middleware
- Auth anônima automática no middleware + next-intl encadeado
- API `/api/health` para verificar sessão
- 20 pacotes seed inseridos no banco
- `supabase/seed.sql` criado no repo
- Build passou

**Decisões:**
- Subagentes abandonados por lentidão; execução inline a partir daqui (mais rápido)

**Próximo:**
- Fase 2: GitHub Action sync catálogo WinGet (task 2.1)

---

## 2026-06-11 — Fases 2 e 3 via subagentes

**Feito (subagentes):**
- **Fase 3 completa:** loja, busca, filtros, detalhe, carrinho Zustand, home com destaques
- **Fase 2 (2.1–2.6):** `scripts/sync-winget/` + GitHub Action workflow
- Build corrigido: removido `--turbopack` do script build (instável no Windows)

**Pendente:**
- 2.7: configurar secrets no GitHub e rodar sync manual
- Fase 4: bundles, favoritos, compartilhamento

**Próximo:**
- Fase 4 via subagente ou inline

---

## 2026-06-11 — Fases 4, 5 e 6 (3 subagentes paralelos)

**Feito:**
- **Fase 4:** APIs favorites/bundles, páginas bundles + slug público, favoritos, histórico downloads
- **Fase 5:** Gerador PS1 com GUI WinForms, API `/api/script/generate`, download/cópia/preview no carrinho
- **Fase 6 (parcial):** Página Ajuda completa, wizard visual, modo iniciante/avançado
- Integração manual: `ScriptActions` + `SaveBundleDialog` no carrinho
- Build passou (45/47)

**Pendente:**
- 2.7: secrets GitHub + sync manual
- 5.7: teste manual do .ps1 no Windows
- 6.4–6.7: deploy Vercel

**Próximo:**
- Deploy Vercel + teste script PS1

---

## 2026-06-11 — Finalização MVP (4 subagentes paralelos)

**Feito:**
- [Deploy Vercel](21d560af-d3f9-4deb-8111-ecb05d64ced1): `vercel.json`, `docs/DEPLOY-VERCEL.md`
- [A11y](3b78fd15-f67b-4a91-a156-09f0c8f05eb4): skip-link, focus rings, labels ARIA
- [GitHub Sync](249b1493-dd16-406b-ae65-90d2741ed20c): `docs/GITHUB-SYNC.md`
- [Validação PS1](26950a3f-df43-4913-afef-3bd536712db3): `scripts/validate-ps1-generator.mjs`, `docs/TEST-PS1.md`, `npm run validate:ps1`
- Build + lint passaram

**Pendente (ação sua):**
- Deploy na Vercel (seguir DEPLOY-VERCEL.md)
- Rodar sync WinGet (seguir GITHUB-SYNC.md)
- Testar .ps1 no Windows (seguir TEST-PS1.md)

---

## 2026-06-11 — Migrations Supabase (1.2–1.5)

**Feito:**
- Criados `supabase/migrations/001_packages.sql` (pg_trgm, tabela packages, índices GIN, trigger search_vector)
- Criados `002_user_tables.sql` (profiles, favorites, bundles, bundle_items, download_history, trigger updated_at)
- Criados `003_rls_policies.sql` (RLS em todas as tabelas conforme spec)
- Criados `004_profile_trigger.sql` (`handle_new_user` em auth.users insert)
- Tracker: 1.2–1.5 marcadas `[x]` (arquivos criados; ainda não aplicados no projeto remoto)

**Próximo:**
- Aplicar migrations (`supabase db push` ou SQL Editor) → task 1.6 cliente SSR

---

## 2026-06-11 — Fase 3: Loja e Catálogo (UI)

**Feito:**
- Instalado `zustand` com persistência em `src/lib/cart-store.ts`
- Queries Supabase SSR em `src/lib/packages/queries.ts` (search, detail, categories, publishers, featured)
- Componentes: `PackageCard`, `SearchBar`, `StoreFilters`, skeletons, `AddToCartButton`, `CartBadge`
- Páginas: Home (busca, chips de categoria, destaques), Loja (grid 24/página, filtros, paginação), detalhe `[packageId]`, Carrinho
- i18n: chaves `store.*`, `cart.*`, `package.*` em pt-BR e en
- Badge de contagem no header; empty states e loading skeletons
- Tracker: 3.1–3.9 marcadas `[x]`; progresso 24/47; fase atual → 4
- `npm run build` e `npm run lint` passaram

**Decisões:**
- Carrinho via Zustand + localStorage (`easywinget-cart`)
- Ícones genéricos por categoria (lucide-react) quando não há `icon_url`
- Busca na loja com debounce 350ms via URL search params

**Próximo:**
- Fase 4: APIs de favoritos e bundles (4.1–4.9)

---

## 2026-06-11 — Fase 2: Sync catálogo WinGet (2.1–2.6)

**Feito:**
- Criado `scripts/sync-winget/` com `parse-manifest.ts`, `upsert-packages.ts`, `index.ts` e `package.json` (ESM, yaml, @supabase/supabase-js, @octokit/rest)
- Parser extrai PackageIdentifier, nome, publisher, versão, descrições, Tags→categories, moniker e installer_type
- Upsert em batches de 500 com `onConflict: package_id` via service role
- Sync incremental: GitHub API — commits e arquivos alterados nas últimas 24h em `manifests/`
- Sync completa: leitura local de `WINGET_PKGS_DIR` (sparse checkout no workflow); suporte a `FULL_SYNC_MAX_PACKAGES` para MVP
- Workflow `.github/workflows/sync-winget-catalog.yml` — cron 03:00 UTC incremental, domingo 04:00 UTC full, `workflow_dispatch` com opção `full_sync`
- Root `package.json`: script `sync:winget`
- README: seção de secrets GitHub (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Tracker: 2.1–2.6 `[x]`; progresso 30/47

**Decisões:**
- Sync completa no CI via sparse checkout de `microsoft/winget-pkgs` (pasta `manifests`)
- Tags WinGet mapeadas para categorias da loja (`developer-tools`, `productivity`, etc.) com slugify para tags desconhecidas
- Task 2.7 (primeira execução manual) deixada pendente

**Próximo:**
- 2.7: primeira execução manual do workflow e validação de contagem no DB
- Fase 4: APIs de favoritos e bundles (4.1–4.9)

---

## 2026-06-11 — Fix Unauthorized + preparação sync catálogo

**Feito:**
- **5.8:** Middleware passa a cobrir `/api/*`; cookies Supabase aplicados na resposta do next-intl com opções completas
- **`ensureAuthenticatedUser`** em `/api/script/generate`, `/api/favorites`, `/api/bundles`
- **`/api/auth/bootstrap`** + `AnonymousAuthBootstrap` (Turnstile opcional via `NEXT_PUBLIC_TURNSTILE_SITE_KEY`)
- **`scripts/setup-github-sync.ps1`** — configura secrets GitHub e dispara workflow `full_sync=true`
- **`SYNC_EXPORT_JSON`** no script de sync (export sem upsert)
- Docs: CAPTCHA como causa de 401 em `DEPLOY-VERCEL.md`; atalho sync em `GITHUB-SYNC.md`
- Tracker: 5.8 `[x]`; progresso 47/48

**Decisões:**
- Sync completo **não** roda localmente (clone de `winget-pkgs` leva horas) — usar GitHub Actions
- CAPTCHA ativo no Supabase bloqueia auth anônima; desativar em Bot and Abuse Protection (MVP) ou configurar Turnstile
- Catálogo ainda com ~20 pacotes (seed) até rodar `setup-github-sync.ps1` com service role key

**Próximo:**
- Desativar CAPTCHA no Supabase → testar download `.ps1` em produção
- Rodar `.\scripts\setup-github-sync.ps1 -ServiceRoleKey "..."` → validar `select count(*) from packages`
- 5.7 teste manual PS1; 6.7 smoke E2E
