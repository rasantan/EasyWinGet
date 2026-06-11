# EasyWinGet — GitHub e sync do catálogo WinGet

> **Tarefa 2.7** — Primeira execução manual do workflow e validação da contagem no Supabase.  
> Workflow: [`.github/workflows/sync-winget-catalog.yml`](../.github/workflows/sync-winget-catalog.yml)  
> Script: [`scripts/sync-winget/`](../scripts/sync-winget/)

---

## Visão geral

O workflow **Sync WinGet Catalog** importa manifests do repositório [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs) para a tabela `packages` no Supabase.

| Modo | Quando roda | Como obtém os manifests |
|------|-------------|-------------------------|
| **Incremental** | Diário às 03:00 UTC (cron) ou manual com `full_sync: false` | API do GitHub — commits das últimas 24 h |
| **Completo** | Domingo às 04:00 UTC (cron) ou manual com `full_sync: true` | Checkout sparse de `microsoft/winget-pkgs` (pasta `manifests/`) |

O script de sync (`scripts/sync-winget/index.ts`) faz parse dos YAML, deduplica por `package_id` e faz upsert em lotes de 500 registros via service role.

---

## 1. Enviar o repositório para o GitHub

### Pré-requisitos

- Conta no [GitHub](https://github.com)
- [Git](https://git-scm.com/) instalado localmente
- Migrations do Supabase já aplicadas (tabela `packages` existente)

### Criar o repositório remoto

1. No GitHub: **New repository** → nome sugerido `EasyWinGet` → visibilidade à sua escolha.
2. **Não** marque “Add a README” se o projeto local já tiver histórico Git (evita conflito no primeiro push).

### Primeiro push (repositório local já com commits)

No terminal, na pasta do projeto (`C:\Users\SILIBRINA\Desktop\EasyWinGet`):

```powershell
git remote add origin https://github.com/SEU_USUARIO/EasyWinGet.git
git branch -M main
git push -u origin main
```

Substitua `SEU_USUARIO/EasyWinGet` pelo seu usuário e nome do repositório.

### Primeiro push (ainda sem Git local)

```powershell
cd C:\Users\SILIBRINA\Desktop\EasyWinGet
git init
git add .
git commit -m "Initial commit: EasyWinGet MVP"
git remote add origin https://github.com/SEU_USUARIO/EasyWinGet.git
git branch -M main
git push -u origin main
```

### Conferir

- Em **Code** no GitHub, confirme a presença de `.github/workflows/sync-winget-catalog.yml` e `scripts/sync-winget/`.
- Em **Actions**, o workflow **Sync WinGet Catalog** deve aparecer na lista (ainda sem execução até configurar secrets e disparar manualmente).

---

## 2. Configurar secrets no GitHub

O workflow precisa de credenciais Supabase com permissão de escrita na tabela `packages`. O `GITHUB_TOKEN` do Actions já é injetado automaticamente (sync incremental).

### Onde adicionar

1. Repositório no GitHub → **Settings**
2. **Secrets and variables** → **Actions**
3. **New repository secret** para cada item abaixo

| Secret | Valor | Observação |
|--------|-------|------------|
| `SUPABASE_URL` | URL do projeto | Mesmo valor de `NEXT_PUBLIC_SUPABASE_URL` no app (ex.: `https://xxxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave **service_role** | **Nunca** commitar nem usar no frontend/Vercel |

### Onde encontrar no painel Supabase

1. [supabase.com/dashboard](https://supabase.com/dashboard) → selecione o projeto EasyWinGet
2. **Project Settings** (ícone de engrenagem) → **API**
3. Em **Project URL** → copie para `SUPABASE_URL`
4. Em **Project API keys** → **service_role** → **Reveal** → copie para `SUPABASE_SERVICE_ROLE_KEY`

> A chave `service_role` ignora RLS e permite upsert na tabela `packages`. Mantenha apenas em GitHub Secrets (e ambiente local de sync, se necessário). Não configure `SUPABASE_SERVICE_ROLE_KEY` na Vercel.

### Checklist antes da primeira execução

- [ ] Migrations aplicadas (`supabase/migrations/001_packages.sql` e demais)
- [ ] `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` criados em **Actions secrets**
- [ ] Repositório no GitHub com o workflow na branch padrão (`main`)

**Atalho (Windows + GitHub CLI):** com a service role key em mãos:

```powershell
.\scripts\setup-github-sync.ps1 -ServiceRoleKey "sua-service-role-key"
```

---

## 3. Executar o workflow manualmente (sync completo)

A **primeira carga** do catálogo deve ser um sync **completo** (`full_sync: true`). Isso faz checkout do repositório `microsoft/winget-pkgs` e processa todos os manifests em `manifests/`.

### Passo a passo

1. GitHub → repositório → aba **Actions**
2. Barra lateral: **Sync WinGet Catalog**
3. **Run workflow**
4. Branch: `main` (ou a branch onde o workflow está)
5. Campo **Run full catalog sync (requires winget-pkgs checkout)** → marque **true**
6. **Run workflow**

### O que esperar

- **Duração:** sync completo pode levar **várias horas** (dezenas de milhares de manifests). O job tem timeout de **360 minutos** (6 h).
- **Logs úteis:**
  - `EasyWinGet WinGet sync — mode: full`
  - `Found N manifest files in winget-pkgs/manifests`
  - `Parsed N unique packages`
  - `Batch X: upserted 500 packages`
  - `Sync complete.` / `Upserted: …` / `Errors: …`
- **Resumo:** ao final, em **Summary** do job: modo `full`, trigger `workflow_dispatch`.

### Sync incremental (opcional, depois da primeira carga)

Para atualizar só o que mudou nas últimas 24 h:

1. **Run workflow** com **full_sync: false** (padrão)
2. O script usa `GITHUB_TOKEN` e a API do GitHub para listar commits recentes em `microsoft/winget-pkgs`

---

## 4. Validar contagem no Supabase

Após o workflow terminar com sucesso (`Errors: 0` nos logs), confira os dados no Supabase.

### SQL Editor

Dashboard → **SQL Editor** → **New query**

**Contagem total de pacotes:**

```sql
select count(*) as total_packages
from public.packages;
```

**Contagem por sync recente** (útil para confirmar que a carga populou a tabela):

```sql
select
  count(*) as total,
  count(*) filter (where last_synced_at > now() - interval '1 day') as synced_last_24h,
  min(last_synced_at) as oldest_sync,
  max(last_synced_at) as newest_sync
from public.packages;
```

**Amostra de registros:**

```sql
select package_id, name, publisher, version, last_synced_at
from public.packages
order by last_synced_at desc
limit 20;
```

### Valores esperados (primeira sync completa)

- `total_packages` deve ser **bem maior que zero** (catálogo WinGet tem milhares de entradas; o número exato varia com o estado do repositório upstream).
- `newest_sync` deve ser próximo do horário em que o workflow terminou.
- Se você tinha seed de desenvolvimento (~20 pacotes fake), o total após sync completo deve **substituir/crescer** com IDs reais do WinGet (`Publisher.Package`).

### Validar na aplicação

Com o app rodando (`npm run dev`) e variáveis `NEXT_PUBLIC_SUPABASE_*` corretas, abra a loja (`/pt-BR/store`) e confira se a listagem e a busca retornam pacotes reais.

---

## 5. Solução de problemas

### `SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required`

| Causa | Solução |
|-------|---------|
| Secrets não criados ou nome errado | Criar exatamente `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` em **Settings → Secrets and variables → Actions** |
| Workflow em fork sem secrets | Forks não herdam secrets; configure no seu repositório ou use o upstream com permissão |

### `Invalid API key` / `401` / `403` no upsert

| Causa | Solução |
|-------|---------|
| Service role incorreta ou truncada | Copiar de novo em **Project Settings → API → service_role** (botão Reveal) |
| URL errada | Usar **Project URL** (`https://….supabase.co`), sem barra final extra |
| Chave anon no lugar da service_role | A anon key não tem permissão de escrita em massa; use **service_role** |

### `relation "public.packages" does not exist`

| Causa | Solução |
|-------|---------|
| Migrations não aplicadas | Rodar migrations do projeto (`supabase db push` ou SQL manual de `supabase/migrations/001_packages.sql`) |

### `Batch N failed: …` / `Errors: > 0` no final

| Causa | Solução |
|-------|---------|
| Violação de constraint (ex.: `package_id` duplicado no mesmo batch) | Reexecutar sync; upsert usa `onConflict: package_id` — erros pontuais podem ser manifest corrompido upstream |
| Payload muito grande ou timeout de API | Ver mensagem completa no log do batch; reexecutar; se persistir, abrir issue com o `package_id` do lote |
| Limite de taxa Supabase | Aguardar e reexecutar; reduzir carga não é necessário no Actions (já usa batches de 500) |

### `FULL_SYNC requires WINGET_PKGS_DIR …`

| Causa | Solução |
|-------|---------|
| `full_sync: true` sem checkout de `winget-pkgs` | Disparar workflow pelo GitHub Actions (não rodar só o script local sem `WINGET_PKGS_DIR`). O workflow define `WINGET_PKGS_DIR=winget-pkgs/manifests` automaticamente no modo full |
| Execução local sem variáveis | `FULL_SYNC=true WINGET_PKGS_DIR=caminho/para/winget-pkgs/manifests npm run start` em `scripts/sync-winget/` |

### `Nothing to sync.` (sync incremental)

| Causa | Solução |
|-------|---------|
| Nenhum manifest alterado nas últimas 24 h em `microsoft/winget-pkgs` | Comportamento esperado no modo incremental |
| Primeira carga ainda não feita | Usar **full_sync: true** |
| `GITHUB_TOKEN` sem acesso à API | Em repositório público padrão o token do Actions costuma bastar; verifique rate limit nos logs |

### Job cancelado ou `The job was not successful` após ~6 h

| Causa | Solução |
|-------|---------|
| Timeout de 360 minutos | Sync completo muito longo; reexecutar — upserts são idempotentes (`onConflict: package_id`). Pacotes já gravados permanecem; o job continua de onde o parse/upsert progredir |
| Falha de rede no checkout sparse | Reexecutar workflow; verificar status do GitHub |

### `npm ci` falha em **Install sync dependencies**

| Causa | Solução |
|-------|---------|
| `package-lock.json` ausente ou desatualizado | Garantir que `scripts/sync-winget/package-lock.json` está commitado no repositório |
| Versão Node incompatível | Workflow usa Node 20; alinhar ambiente local se reproduzir o erro |

### Sync “ok” no GitHub mas loja vazia

| Causa | Solução |
|-------|---------|
| App apontando para outro projeto Supabase | Conferir `NEXT_PUBLIC_SUPABASE_URL` na Vercel/`.env.local` — mesmo projeto dos secrets do Actions |
| Cache do navegador | Hard refresh; testar em aba anônima |
| RLS na leitura | Política `packages_public_read` permite `select` anônimo; se alterou RLS, revisar `supabase/migrations/003_rls_policies.sql` |

### Testar sync localmente (opcional)

Útil para depurar antes do Actions:

```powershell
cd scripts\sync-winget
npm ci

# Incremental (precisa GITHUB_TOKEN com acesso à API pública)
$env:SUPABASE_URL="https://xxxxx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="sua-service-role"
$env:GITHUB_TOKEN="ghp_..."
npm run start

# Completo (precisa clone local de winget-pkgs)
$env:FULL_SYNC="true"
$env:WINGET_PKGS_DIR="C:\caminho\winget-pkgs\manifests"
npm run start
```

---

## Referência rápida

| Item | Local |
|------|--------|
| Workflow | `.github/workflows/sync-winget-catalog.yml` |
| Entrypoint do script | `scripts/sync-winget/index.ts` (`npm run start`) |
| Upsert em lotes | `scripts/sync-winget/upsert-packages.ts` (batch 500) |
| Tabela destino | `public.packages` |
| Chave de conflito | `package_id` (texto, ex.: `Microsoft.PowerShell`) |
| Cron incremental | `0 3 * * *` (03:00 UTC diário) |
| Cron completo | `0 4 * * 0` (04:00 UTC domingo) |

---

## Próximo passo

Após validar a contagem no SQL Editor e na loja, marque a tarefa **2.7** como concluída no [`PROJECT-TRACKER.md`](PROJECT-TRACKER.md) e registre a execução em [`HISTORY.md`](HISTORY.md).
