# EasyWinGet — Project Tracker

> **Fonte da verdade** para progresso entre sessões. Atualizar ao concluir, adicionar ou remover tarefas.  
> Spec: [`docs/superpowers/specs/2026-06-11-easywinget-design.md`](superpowers/specs/2026-06-11-easywinget-design.md)  
> Plano: [`docs/superpowers/plans/2026-06-11-easywinget-mvp.md`](superpowers/plans/2026-06-11-easywinget-mvp.md)  
> Histórico: [`docs/HISTORY.md`](HISTORY.md)

**Última atualização:** 2026-06-11 (launcher .cmd corrigido)  
**Fase atual:** 6 — Ajuda, Deploy e Polish  
**Progresso:** 48 / 48 tarefas

> **Site no ar:** https://easywinget.vercel.app  
> **Sync em andamento:** [GitHub Actions — Sync WinGet Catalog](https://github.com/rasantan/EasyWinGet/actions/workflows/sync-winget-catalog.yml) (full sync disparado 2026-06-11)  
> **CAPTCHA:** desativado — auth anônima OK (`/api/auth/bootstrap` retorna userId)

---

## Legenda

- `[ ]` pendente · `[x]` concluída · `[-]` cancelada · `[~]` em progresso
- Adicione tarefas em **Backlog**; mova para a fase correta quando for implementar
- Remova ou marque `[-]` — registre a mudança em `HISTORY.md`

---

## Fase 0 — Scaffold do Projeto

- [x] **0.1** Criar app Next.js 15 (App Router, TypeScript, Tailwind, ESLint)
- [x] **0.2** Configurar shadcn/ui (tema claro/escuro, tokens acessíveis)
- [x] **0.3** Instalar e configurar `next-intl` (rotas `/pt-BR` e `/en`)
- [x] **0.4** Criar arquivos `messages/pt-BR.json` e `messages/en.json` (strings base)
- [x] **0.5** Layout raiz: header, footer, seletor de idioma, navegação
- [x] **0.6** README.md com setup local e variáveis de ambiente
- [x] **0.7** `.env.example` com placeholders Supabase/Vercel

---

## Fase 1 — Supabase (Auth + Database)

- [x] **1.1** Criar projeto Supabase e habilitar Anonymous Auth
- [x] **1.2** Migration: tabela `packages` + índices full-text
- [x] **1.3** Migration: tabelas `profiles`, `favorites`, `bundles`, `bundle_items`, `download_history`
- [x] **1.4** Migration: políticas RLS para todas as tabelas
- [x] **1.5** Trigger/função: criar `profiles` após sign-up anônimo
- [x] **1.6** Cliente Supabase SSR (`@supabase/ssr`) — client, server, middleware
- [x] **1.7** Middleware: auth anônima automática na 1ª visita
- [x] **1.8** Seed mínimo: ~20 pacotes fake para dev (opcional, facilita UI antes do sync)

---

## Fase 2 — Sync Catálogo WinGet (GitHub Action)

- [x] **2.1** Script `scripts/sync-winget/index.ts` — parser de manifests YAML
- [x] **2.2** Upsert em batches para Supabase (service role)
- [x] **2.3** Workflow `.github/workflows/sync-winget-catalog.yml` (cron + manual)
- [x] **2.4** Sync incremental (manifests alterados últimas 24h)
- [x] **2.5** Sync completa semanal
- [x] **2.6** Secrets GitHub: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [~] **2.7** Primeira execução manual e validação de contagem no DB _(workflow full sync **em andamento** — validar count > milhares ao concluir)_

---

## Fase 3 — Loja e Catálogo (UI)

- [x] **3.1** Página Home (`/[locale]`) — busca, categorias, destaques
- [x] **3.2** Página Loja (`/[locale]/store`) — grid, paginação (24/página)
- [x] **3.3** Filtros: categoria, publisher, installer_type
- [x] **3.4** Busca full-text com debounce
- [x] **3.5** Página detalhe (`/[locale]/store/[packageId]`)
- [x] **3.6** Componente `PackageCard` (ícone fallback, nome, publisher, badge categoria)
- [x] **3.7** Estado global/seleção: carrinho (Context ou Zustand)
- [x] **3.8** Página Carrinho (`/[locale]/cart`) — revisar, remover, contagem
- [x] **3.9** Empty states e skeletons de loading

---

## Fase 4 — Bundles, Favoritos e Compartilhamento

- [x] **4.1** API `/api/favorites` — GET/POST/DELETE
- [x] **4.2** API `/api/bundles` — CRUD do usuário
- [x] **4.3** API `/api/bundles/[slug]` — leitura pública
- [x] **4.4** Página Meus Bundles (`/[locale]/bundles`)
- [x] **4.5** Criar/editar bundle a partir do carrinho
- [x] **4.6** Toggle `is_public` + geração de `slug`
- [x] **4.7** Página bundle compartilhado (`/[locale]/bundles/[slug]`)
- [x] **4.8** Botão favoritar na listagem e detalhe
- [x] **4.9** Histórico de downloads na página bundles

---

## Fase 5 — Geração de Script PS1

- [x] **5.1** Módulo `src/lib/script-generator/` — template PS1 + manifest JSON
- [x] **5.2** Strings GUI bilíngues (PT/EN) no template
- [x] **5.3** API `POST /api/script/generate` — validação, hash SHA-256, log history
- [x] **5.4** UI Review: preview do script (modo avançado)
- [x] **5.5** Botão Download instalador `.cmd` (PS1 embutido; bypass execution policy + UAC)
- [x] **5.6** Botão Copiar script (clipboard)
- [x] **5.7** Testar script gerado em Windows 10/11 _(`.cmd` OK local; deploy pendente para produção)_
- [x] **5.8** Corrigir 401 em `/api/script/generate` (middleware `/api`, bootstrap auth, fallback `ensureAuthenticatedUser`)

---

## Fase 6 — Ajuda, Deploy e Polish

- [x] **6.1** Página Ajuda (`/[locale]/help`) — MOTW, WinGet, execução PowerShell
- [x] **6.2** Wizard 3 passos visual (Escolher → Revisar → Baixar)
- [x] **6.3** Modo Iniciante vs Avançado
- [x] **6.4** Deploy Vercel + env vars
- [x] **6.5** Conectar repo GitHub → Vercel (CI/CD)
- [x] **6.6** Revisão acessibilidade (contraste, labels, teclado)
- [~] **6.7** Smoke test end-to-end em produção _(site live: easywinget.vercel.app; após desativar CAPTCHA no Supabase)_

---

## Backlog (ad-hoc)

> Adicione aqui tarefas novas. Mova para uma fase quando for priorizar.

- [ ] _(exemplo: adicionar favicon e OG images)_

---

## Concluídas

- **0.1** — Scaffold Next.js 15.5.19 + Tailwind v4
- **0.2** — shadcn/ui (base-nova), next-themes, componentes base
- **0.3** — next-intl (routing, request, navigation, middleware, `[locale]` segment)
- **0.4** — messages/pt-BR.json e messages/en.json (26 chaves cada)
- **0.5** — Header, Footer, LocaleSwitcher, ThemeToggle; páginas placeholder (store, cart, bundles, help)
- **0.6** — README.md em PT com resumo EN
- **0.7** — `.env.example` (Supabase + SITE_URL)

---

## Notas

- **CAPTCHA desativado** (2026-06-11) — auth anônima funcionando
- **Sync full** disparado via `setup-github-sync.ps1` — aguardar conclusão no GitHub Actions (horas)
- Após sync: `select count(*) from public.packages;` deve ser >> 20
- **Instalador .cmd** (2026-06-11): arquivo único; bypass `ExecutionPolicy`, UAC automático, PS1 embutido; bug IndexOf corrigido (marcador dinâmico `::EWG`+`_PS1_BEGIN`)

