# EasyWinGet

Loja WinGet gratuita, pública e acessível. Escolha aplicativos Windows, monte um carrinho e baixe um script PowerShell autocontido para instalar tudo de uma vez — com interface bilíngue (PT-BR / EN) e foco em UX democrática.

## O que é o EasyWinGet

O EasyWinGet transforma o catálogo oficial do [WinGet](https://learn.microsoft.com/en-us/windows/package-manager/winget/) em uma experiência web simples: buscar apps, montar listas (bundles), favoritar pacotes e gerar um `.ps1` auditável para instalação local no Windows 10/11.

## Pré-requisitos

- **Node.js** 20 ou superior
- **npm** (incluído com Node)

## Setup local

```bash
git clone <url-do-repositorio>
cd EasyWinGet
npm install
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais Supabase quando configurar a Fase 1. Para desenvolvimento inicial do layout, as variáveis podem ficar vazias.

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) — o app redireciona para `/pt-BR` (locale padrão).

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (Turbopack) |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | ESLint |
| `npm run sync:winget` | Sync catálogo WinGet → Supabase (ver `scripts/sync-winget/`) |

## GitHub Actions — sync do catálogo

O workflow [`.github/workflows/sync-winget-catalog.yml`](.github/workflows/sync-winget-catalog.yml) sincroniza manifests do repositório [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs) para a tabela `packages` no Supabase.

**Secrets obrigatórios** (Settings → Secrets and variables → Actions):

| Secret | Descrição |
|--------|-----------|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (escrita na tabela `packages`; nunca expor no frontend) |

O `GITHUB_TOKEN` padrão do Actions é usado automaticamente no sync incremental. Agendamento: incremental diário às 03:00 UTC; sync completa aos domingos às 04:00 UTC. Disparo manual via `workflow_dispatch` (opção `full_sync` para sync completa).

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS v4** + **shadcn/ui** (tema claro/escuro)
- **next-intl** — i18n (`/pt-BR`, `/en`)
- **Supabase** — auth anônima, banco e RLS (Fase 1+)
- **GitHub Actions** — sync do catálogo WinGet (Fase 2+)
- **Vercel** — deploy (Fase 6)

## Progresso do projeto

Acompanhe tarefas, fases e status em [`docs/PROJECT-TRACKER.md`](docs/PROJECT-TRACKER.md).

---

## English summary

**EasyWinGet** is a free, public, accessible WinGet store. Pick Windows apps, build a cart, and download a self-contained PowerShell script to install everything at once — bilingual UI (PT-BR / EN) with an inclusive, keyboard-friendly design.

**Quick start:** Node 20+, `npm install`, copy `.env.example` to `.env.local`, then `npm run dev`. See [`docs/PROJECT-TRACKER.md`](docs/PROJECT-TRACKER.md) for the full roadmap.
