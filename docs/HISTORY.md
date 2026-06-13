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

---

## 2026-06-11 — CAPTCHA off + sync catálogo disparado

**Feito:**
- CAPTCHA desativado no Supabase — `/api/auth/bootstrap` retorna `userId` em produção
- Secrets GitHub: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` configurados
- Workflow **Sync WinGet Catalog** disparado (`full_sync=true`, run 27381605050 em andamento)
- Fix PS 5.1 em `scripts/setup-github-sync.ps1` (removido operador `?.`)

**Decisões:**
- Catálogo ainda 20 pacotes até o workflow concluir (pode levar horas)

**Próximo:**
- Marcar 2.7 `[x]` quando `count(*)` >> 20
- Testar download `.ps1` no carrinho; concluir 5.7 / 6.7

---

## 2026-06-11 — Launcher .cmd (execution policy + UAC)

**Feito:**
- `src/lib/script-generator/launcher.ts` — gera `easywinget-install.cmd` com PS1 embutido, `-ExecutionPolicy Bypass`, elevação via `RunAs` e `Unblock-File`
- API `/api/script/generate`: download retorna `.cmd`; `format=script` para copy/preview
- UI: botão **Baixar instalador (.cmd)**; textos de ajuda atualizados (PT/EN)
- `npm run validate:ps1` — assertions do launcher
- `docs/TEST-PS1.md` atualizado

**Decisões:**
- `.cmd` como artefato principal para usuários finais; `.ps1` direto continua disponível só via copiar/visualizar (modo Avançado)

**Próximo:**
- Deploy e teste manual do `.cmd` no Windows (5.7)
- Marcar 2.7 `[x]` quando sync concluir

---

## 2026-06-11 — Polish GUI instalador (.cmd)

**Feito:**
- Botão **Fechar** após conclusão (Enter também fecha); resumo `X concluído(s), Y falha(s)`
- Métricas de download em tempo real (`$metricsLabel`): tamanho, velocidade ou tempo decorrido
- `Invoke-WingetWithProgress`: streaming winget com filtro de barras/spinner corrompidos
- Pacotes já instalados (`-1978335189`, `-1978335135`) → status **Já instalado**, não falha
- UTF-8 `OutputEncoding` + fonte Segoe UI 9pt nos controles
- `validate:ps1` e `TEST-PS1.md` atualizados

**Decisões:**
- Métricas best-effort via parsing da saída winget; fallback para segundos decorridos

**Próximo:**
- Deploy produção (push main → Vercel)

---

## 2026-06-11 — Fix travamento GUI instalador (deadlock winget)

**Feito:**
- Causa: `Process.StandardOutput.ReadLine()` bloqueava a thread WinForms + deadlock stdout/stderr
- Tentativa BackgroundWorker também falhou (DoWork não executava sem message pump adequado)
- Solução: `Start-Job` + log temporário + polling com `DoEvents()` — UI responsiva, métricas em tempo real
- Teste: `scripts/test-winget-worker.ps1` OK em ~1s; `.cmd` local em `scripts/easywinget-test-local.cmd`

**Próximo:**
- Testar GUI localmente com `scripts/easywinget-test-local.cmd` antes de push

---

## 2026-06-11 — Fix launcher .cmd (extração PS1)

**Feito:**
- Corrigido bug crítico: `IndexOf('::EWG_PS1_BEGIN')` encontrava o marcador dentro do próprio comando PowerShell embutido → extraía ~18 chars em vez do script completo
- Solução: marcador montado em runtime (`'::EWG'+'_PS1_BEGIN'`) + comprimento dinâmico via `$mb.Length`
- Launcher simplificado: batch mínimo + `-Command` inline (sem `-EncodedCommand`/BOM)
- Testes: `npm run validate:ps1` ✅; `scripts/test-extract.ps1` confirma extração ~6,8 KB e parse válido (Git + 7-Zip)
- `.cmd` de teste regenerado em `Downloads/easywinget-install.cmd`

**Decisões:**
- Um único arquivo `.cmd` para usuário final; sem `.ps1` separado no download

**Próximo:**
- Usuário: dois cliques no `.cmd` → UAC Sim → confirmar GUI abre (5.7 manual)
- Deploy para produção

---

## 2026-06-11 — Fix encoding PS1 no launcher .cmd

**Feito:**
- Causa raiz: caractere `—` (em-dash UTF-8) corrompido ao extrair PS1 → parse error no PowerShell 5.1
- Substituído `—` por `-` ASCII em `generate.ts` e `strings.ts`
- Leitura do `.cmd` com `[Text.UTF8Encoding]` explícito no launcher
- Teste local: extração OK, GUI abre sem erro

**Próximo:**
- Confirmar no PC do usuário; deploy

---

## 2026-06-11 — Web: .cmd download + toggle carrinho

**Feito:**
- Download usa `.cmd` via API (`format=launcher`) + filename do header `Content-Disposition`
- Launcher com CRLF para Windows
- Botão Add/Remover no carrinho (`AddToCartButton` + `PackageCard`)
- 5.7 marcado `[x]` após teste local OK

**Próximo:**
- Deploy Vercel para produção servir `.cmd`

---

## 2026-06-11 — Commit + deploy produção

**Feito:**
- Commit `aff01e7`: launcher `.cmd`, toggle Add/Remover, fix encoding
- Push `main` → GitHub (email noreply no committer)
- Vercel production **Ready** (~42s) — https://easywinget.vercel.app

---

## 2026-06-11 — Integração do agente Antigravity e Alinhamento de Regras

**Feito:**
- Alinhamento de diretrizes e regras com o agente Antigravity (seguindo as especificações de `.cursor/rules/project-tracking.mdc`).
- Leitura e mapeamento de `docs/PROJECT-TRACKER.md` e `docs/HISTORY.md` pelo novo agente.

**Decisões:**
- O agente Antigravity seguirá estritamente as regras de rastreamento do projeto (atualizar trackers, histórico e planos).

**Próximo:**
- Aguardar as instruções do usuário para novas tarefas no backlog ou novas fases.

---

## 2026-06-11 — Substituição de Carrinho por Lista Lateral ("Meu Kit") e Overhaul de UX/UI

**Feito:**
- Atualização das chaves de idioma em `pt-BR.json` e `en.json` (substituição de vocabulário comercial "carrinho" / "cart" por utilitário de sistema "Meu Kit" / "My Kit" e "Selecionado" / "Selected").
- Extensão do estado Zustand em `cart-store.ts` para gerenciar a visibilidade da barra lateral de forma global (`isOpen`, `setOpen`) com persistência apenas nos itens selecionados.
- Criação do componente `InstallListSidebar.tsx` utilizando a gaveta `Sheet` do shadcn/ui.
- Integração da barra lateral no `header.tsx` e alteração da funcionalidade do botão de kit para abrir a barra lateral em qualquer página.
- Refatoração da página `/cart` para redirecionar o usuário para a loja e abrir a barra lateral automaticamente.
- Aplicação de tema de cores tecnológico e premium (indigo-violeta vibrante em OKLCH) no `globals.css` para os modos claro e escuro.
- Polimento dos efeitos dinâmicos de hover e sombra nos componentes `PackageCard.tsx`.
- Validação do projeto executando `npm run build` com sucesso.

**Decisões:**
- A barra lateral abre automaticamente após selecionar um aplicativo para dar feedback de ação imediato ao usuário.
- O redirecionamento de `/cart` para `/store` mantém a compatibilidade caso o usuário acesse URLs legadas ou favoritadas, fornecendo a experiência correta sem quebrar a navegação.
- O tema completamente cinza-neutro foi substituído por uma paleta vibrante de alta fidelidade com destaque na cor indigo.

**Próximo:**
- Receber feedback do usuário para possíveis novos ajustes estéticos ou funcionais.

---

## 2026-06-12 — Rebranding para WinStack e Redesign Estético UX/UI

**Feito:**
- **Rebranding de Marca:** Renomeado EasyWinGet para **WinStack** em todas as traduções (`messages/en.json` e `messages/pt-BR.json`), metadados (`layout.tsx`), header, footer e geradores de scripts.
- **Powershell Terminal Simulator:** Desenvolvido um componente de simulação interativo (`TerminalPreview.tsx`) na Landing Page para ilustrar em tempo real o funcionamento do instalador do WinStack.
- **Deployment Stepper Assistant:** Implementado um assistente passo a passo interativo de 3 fases (`ScriptActions.tsx`) ao baixar o instalador para orientar o usuário no processo de download, no desbloqueio contra SmartScreen (MOTW) no Windows Explorer, e na execução final.
- **Design System OKLCH:** Atualizados tokens em `globals.css` com um tom escuro premium (midnight-indigo) de alta fidelidade e tons vibrantes de indigo no tema claro e escuro.
- **Glassmorphism & Glow Effects:** Criados utilitários CSS `.glass-card` (desfoque de fundo e bordas translúcidas) e `.glow-hover` (translação e sombra brilhante colorida de acordo com a categoria do pacote selecionado: verde para produtividade, rosa para games, roxo para redes sociais, azul para navegadores).
- **Validação de Build:** A build de produção foi gerada via `npm run build` com sucesso absoluto e correção de lints não utilizados.

**Decisões:**
- A nomenclatura mudou de "My Kit" (Meu Kit) para "My Stack" (Meu Stack) e "Bundles" para "Stacks" para dar uma identidade mais focada em desenvolvedores e administração de sistemas.
- A simulação de terminal e o assistente de desbloqueio reduzem drasticamente a fricção de novos usuários com avisos de segurança do Windows SmartScreen.
- Persistência de carrinho atualizada para a chave `winstack-cart`.

**Próximo:**
- Monitorar a conclusão do workflow incremental no repositório de produção e feedbacks do usuário.

---

## 2026-06-12 — Sidebar fixável e pipeline de enriquecimento de metadados

**Feito:**
- **Sidebar fixável (pin):** `cart-store` com `isPinned`, `autoOpen` e `badgePulse` persistidos; `MainLayoutWrapper` aplica `lg:mr-96` e renderiza `InstallListSidebarDocked` sem overlay em desktop.
- **Gaveta responsiva:** abaixo de `1024px` a sidebar volta ao drawer (`InstallListSidebar`); com pin ativo em desktop, adicionar apps não abre modal.
- **Toggle auto-open:** botão na sidebar; quando desativado, badge do header pulsa ao adicionar app.
- **Pipeline lazy de metadados:** `enrichment.ts` consulta Wikipedia REST API e fallback Google Favicon; `getPackageByPackageId` hidrata na leitura e persiste via service role (`admin.ts`).
- **Ícones reais:** `PackageIcon` em `PackageCard` e página de detalhe; strings i18n `pin`, `unpin`, `autoOpen`.
- **Build:** `npm run build` passou.

**Decisões:**
- `SUPABASE_SERVICE_ROLE_KEY` adicionada ao `.env.example` para cache de metadados no servidor (não expor no cliente).
- Conteúdo da sidebar extraído em `install-list-sidebar-content.tsx` compartilhado entre drawer e docked.

**Próximo:**
- Teste manual: pin sidebar na loja + hidratação em `/store/Google.Chrome`.

---

## 2026-06-13 — Brainstorming + Plano: população do catálogo WinGet (index.db), schema, ícones e UI

**Feito:**
- Diagnóstico: o full sync atual clona o repo inteiro `microsoft/winget-pkgs` (timeout no GitHub Action) e o parser lê o *version manifest* (sem metadados), gerando pacotes vazios; ícones via fallback frequentemente não-oficiais.
- Escolhida abordagem da **fonte pré-indexada oficial** (`source2.msix` → `Public/index.db` SQLite) rodando **localmente**, gravando no Supabase de produção (que a Vercel lê).
- Escopo expandido (a pedido): descrições **oficiais** (deep-fetch incremental do `.locale`), mudança de schema e overhaul da UI da loja.
- Spec aprovado: `docs/superpowers/specs/2026-06-13-winget-catalog-population-design.md`
- Plano de implementação (16 tasks, 2 fases, TDD): `docs/superpowers/plans/2026-06-13-winget-catalog-population.md`
- Tracker: adicionada **Fase 9** (9.1–9.16, pendentes).

**Decisões:**
- Híbrido: `index.db` dá a lista completa (id+versão); deep-fetch do manifest `.locale` só para pacotes novos/alterados (incremental por versão).
- Caminho do manifest derivado pela convenção do winget-pkgs (id+versão), mais robusto que `pathparts`.
- Schema `005`: `homepage`, `publisher_url`, `publisher_support_url`, `license`, `release_date`, `tags[]`, `popularity`, `is_featured`.
- `popularity` derivada do `download_history` interno + favoritos (sem fonte oficial no WinGet).
- Ícones: resolver domínio oficial (homepage/publisher_url) → cadeia de favicon validada → Wikipedia/genérico.
- Upsert sanitiza payload para não sobrescrever `icon_url`/`description_full` enriquecidos com null.

**Próximo:**
- Executar a Fase 9 (começar por 9.1). Opções: subagent-driven ou inline (executing-plans).

---

## 2026-06-12 — Configuração SUPABASE_SERVICE_ROLE_KEY (local + Vercel)

**Feito:**
- `SUPABASE_SERVICE_ROLE_KEY` adicionada ao `.env.local`.
- Vercel: variável configurada em **Production** e **Development** (criptografada em production).
- Script reutilizável `scripts/configure-service-role-env.mjs` para repetir a configuração.
- Redeploy de produção na Vercel para carregar a nova variável.
- Verificação: service role consegue ler `packages` no Supabase.

**Decisões:**
- Preview na Vercel exige configuração manual no dashboard (limitação do CLI com branch único `main`).
- Chave obtida via Supabase Management API (não commitada).

**Próximo:**
- Adicionar `SUPABASE_SERVICE_ROLE_KEY` em Preview no dashboard Vercel, se usar preview deployments.

---

## 2026-06-13 — Fase 9: implementação do catálogo WinGet (hybrid sync, schema, ícones, UI)

**Feito:**
- Implementadas as 16 tarefas da Fase 9 via execução em ondas com subagentes paralelos (arquivos disjuntos por onda), com commits sequenciais coordenados pelo agente principal.
- Pipeline de sync híbrido em `scripts/sync-winget/`:
  - `download-source.ts` (baixa `source2.msix` da CDN com fallback), `extract-index.ts` (extrai `Public/index.db` via `adm-zip`), `read-index.ts` (lê `index.db` com `node:sqlite`, maior versão por `package_id`, checagem defensiva de tabelas).
  - `version-compare.ts`, `parse-manifest.ts`/`fetch-manifest.ts` (deep-fetch e parse dos manifests oficiais `.locale` para metadados ricos), `select-entries.ts` (diff incremental por versão com limite opcional), `upsert-packages.ts` (sanitização para não sobrescrever campos enriquecidos com null/vazio).
  - `index.ts` orquestra: download → extract → read index → diff vs. versões existentes → deep-fetch concorrente → upsert → `recalc_package_popularity`; suporta `--limit` e `SYNC_EXPORT_JSON`.
- Migrations: `005_packages_metadata.sql` (colunas de metadados/popularidade + função `recalc_package_popularity`) e `006_catalog_facets.sql` (RPCs `distinct_categories`/`distinct_publishers`).
- Ícones: `icon-sources.ts` + enrichment com resolução por domínio oficial e cadeia de fallback validada por content-type.
- UI da loja: ordenação (`relevance`/`name`/`recent`) nas queries e seletor na UI; ícones com `loading=lazy`/`decoding=async`/`referrerPolicy=no-referrer`; filtros via RPC distinct.
- GitHub Action reescrito para fonte leve (Node 24).
- Verificação: 15/15 testes do sync verdes; `next build` OK.

**Decisões:**
- Trocado `better-sqlite3` por `node:sqlite` (built-in do Node 24) por falta de toolchain C++/prebuilt no ambiente; Action alinhada para Node 24.
- Commits seletivos por onda para isolar o trabalho da Fase 9 das alterações prévias não relacionadas na working tree.

**Próximo:**
- Aplicar migrations `005` e `006` no Supabase de produção e rodar o sync (primeiro com `--limit` para validar, depois full). Requer envs de produção carregadas.

---

## 2026-06-13 — Fase 9: migrations aplicadas, correções de schema e primeiro sync real

**Feito:**
- Migrations `005` e `006` aplicadas no Supabase de produção (projeto `yqhjscguprljiiajwncw`) via MCP.
- Corrigidos dois bugs descobertos ao rodar contra a fonte real:
  - Extração: o `source2.msix` real usa *data descriptors* no zip, que o `adm-zip` rejeita (`Descriptor data is malformed`). Trocado por `fflate` (pura-JS, lê o *central directory*); `adm-zip` removido das deps.
  - Schema: o `index.db` real usa o schema **v2** (tabela única `packages` com `id`/`latest_version`), não o `manifest`/`ids`/`versions`. `read-index` reescrito para v2 com fallback ao schema legado.
- Sync de validação com `--limit 300`: 13.253 pacotes na fonte pré-indexada, 300 deep-fetched, 300 upserted, 0 erros, popularidade recalculada.
- Validação no banco: 319 pacotes totais; metadados oficiais preenchidos (license, homepage, description_full, tags) — ex.: `0-don.clippy` (MIT, GitHub homepage, 4 tags).

**Decisões:**
- `fflate` em vez de `adm-zip` por robustez com MSIX e por ser pura-JS (funciona no CI sem toolchain nativo).
- `read-index` mantém suporte ao schema legado por segurança, mas prioriza o v2.

**Próximo:**
- Rodar o sync completo (`npm run start`, sem `--limit`) para popular os ~13k pacotes restantes.
- Conferir a UI da loja com o catálogo cheio (ordenação, filtros via RPC, ícones).

