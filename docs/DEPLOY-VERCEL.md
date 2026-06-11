# Deploy na Vercel — EasyWinGet

Guia passo a passo para publicar o EasyWinGet na Vercel, conectar o repositório GitHub e configurar Supabase para produção e previews.

**Pré-requisitos:** projeto Supabase criado, Anonymous Auth habilitado, migrations aplicadas e código no GitHub.

---

## 1. Preparar o repositório

1. Confirme que o branch principal (`main` ou `master`) contém:
   - `package.json` com scripts `build` e `start`
   - `vercel.json` (preset Next.js, região `gru1`)
   - `.env.example` com as variáveis públicas
2. Faça push do código para o GitHub (organização ou conta pessoal).

---

## 2. Importar o projeto na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new) e faça login (de preferência com a mesma conta do GitHub).
2. Clique em **Add New… → Project**.
3. Em **Import Git Repository**, selecione o repositório **EasyWinGet**.
4. Na tela de configuração:
   - **Framework Preset:** Next.js (detectado automaticamente; `vercel.json` reforça o preset)
   - **Root Directory:** `.` (raiz do repositório)
   - **Build Command:** `npm run build` (padrão)
   - **Output Directory:** deixe em branco (Next.js gerencia)
   - **Install Command:** `npm install` (padrão)
5. **Ainda não clique em Deploy** — configure as variáveis de ambiente na próxima seção.

---

## 3. Variáveis de ambiente na Vercel

Em **Settings → Environment Variables** (ou na etapa de importação), adicione:

| Variável | Onde obter | Ambientes |
|----------|------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → **Project Settings → API → Project URL** | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → **Project Settings → API → anon public** | Production, Preview, Development |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site (ver abaixo) | Production, Preview, Development |

### Valores recomendados para `NEXT_PUBLIC_SITE_URL`

| Ambiente | Valor | Exemplo |
|----------|-------|---------|
| **Production** | Domínio de produção (com `https://`) | `https://easywinget.vercel.app` ou `https://seudominio.com` |
| **Preview** | URL dinâmica do deploy de preview | `https://${VERCEL_URL}` |
| **Development** | Local | `http://localhost:3000` |

> **Preview na Vercel:** use o valor `https://${VERCEL_URL}` apenas no ambiente **Preview**. A Vercel substitui `${VERCEL_URL}` pelo host do deploy (ex.: `easywinget-git-feature-usuario.vercel.app`).

Copie os valores do Supabase para os três ambientes. Nunca commite `.env.local` nem a **service role key** no frontend ou na Vercel (ela fica só nos secrets do GitHub Actions para o sync do catálogo).

---

## 4. Primeiro deploy

1. Com as variáveis configuradas, clique em **Deploy**.
2. Aguarde o build (`npm run build`). O log deve terminar sem erros.
3. Anote a URL de produção, por exemplo: `https://easywinget.vercel.app`.
4. Atualize `NEXT_PUBLIC_SITE_URL` em **Production** se você usou um placeholder no primeiro deploy.
5. Opcional: **Settings → Domains** para adicionar domínio customizado e apontar DNS.

---

## 5. CI/CD — GitHub → Vercel

Após a importação, a Vercel cria a integração Git automaticamente:

| Evento | Comportamento |
|--------|----------------|
| Push em `main` | Deploy de **Production** |
| Push em outro branch | Deploy de **Preview** (URL única por branch/PR) |
| Pull Request aberto | Preview + comentário da Vercel no PR |

Não é necessário workflow extra no repositório para o app Next.js. O sync do catálogo WinGet continua no GitHub Actions (`.github/workflows/sync-winget-catalog.yml`) com secrets próprios (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

---

## 6. Supabase — URLs de redirect (Auth)

O EasyWinGet usa **auth anônima** no middleware (`signInAnonymously` na primeira visita). Mesmo sem OAuth, o Supabase exige **Site URL** e **Redirect URLs** corretas para cookies e callbacks funcionarem em cada origem.

No painel Supabase: **Authentication → URL Configuration**.

### Site URL

Defina a URL principal de produção:

```
https://easywinget.vercel.app
```

(Substitua pelo seu domínio de produção real.)

### Redirect URLs

Adicione **todas** as entradas abaixo (ajuste o slug do projeto/equipe Vercel):

```
https://easywinget.vercel.app/**
https://seudominio.com/**
http://localhost:3000/**
```

#### Previews da Vercel (wildcard)

Deploys de preview usam hosts como `easywinget-git-nome-da-branch-seu-usuario.vercel.app`. Adicione o padrão com wildcard do **seu** escopo Vercel:

```
https://*-seu-usuario.vercel.app/**
```

Substitua `seu-usuario` pelo **slug da equipe/conta** na Vercel (visível em **Settings → General → Team URL** ou no sufixo das URLs de preview).

> **Alternativa mais ampla (menos restritiva):** `https://*.vercel.app/**` cobre qualquer preview, mas aceita qualquer subdomínio `*.vercel.app`. Prefira o padrão com seu slug quando possível.

Após alterar URLs, salve e aguarde alguns segundos antes de testar um novo deploy.

---

## 7. Anonymous Auth no Supabase

Confirme que o login anônimo está ativo:

1. Supabase → **Authentication → Providers**
2. Em **Anonymous Sign-Ins**, ative **Enable Anonymous Sign-Ins**
3. Salve

Sem isso, o middleware falha ao criar sessão na primeira visita e rotas que exigem usuário (favoritos, bundles, geração de script) retornam erro.

---

## 8. Checklist pós-deploy

- [ ] Home abre em `/pt-BR` e `/en`
- [ ] Loja lista pacotes (catálogo já sincronizado no Supabase)
- [ ] Sessão anônima criada (cookies `sb-*` no navegador)
- [ ] Favoritar pacote e criar bundle funcionam
- [ ] Preview de PR abre sem erro de auth (redirect URLs com wildcard)
- [ ] `NEXT_PUBLIC_SITE_URL` correto em Production e Preview

### Smoke test rápido

```text
GET https://<sua-url>/api/health
```

Resposta esperada: JSON com indicação de usuário autenticado (sessão anônima).

---

## 9. Região (`vercel.json`)

O arquivo `vercel.json` na raiz define:

- **framework:** `nextjs`
- **regions:** `["gru1"]` (São Paulo) — funções serverless executam perto do público brasileiro

Se o projeto Supabase estiver em outra região (ex.: `us-east-1`), você pode trocar para `iad1` ou a região mais próxima do banco em **Settings → Functions → Function Region** ou editando `regions` no `vercel.json`. Rebalanceie latência app ↔ banco conforme sua audiência.

---

## 10. Referência rápida

| Recurso | Local |
|---------|--------|
| Variáveis locais | `.env.example` → copiar para `.env.local` |
| Config Vercel | `vercel.json` |
| Secrets do sync (GitHub) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Progresso do MVP | `docs/PROJECT-TRACKER.md` (tarefas 6.4, 6.5) |

---

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| Build falha por env vazia | Variáveis não definidas na Vercel | Conferir os três `NEXT_PUBLIC_*` nos três ambientes |
| Auth falha só em preview | Redirect URL ausente | Adicionar `https://*-seu-usuario.vercel.app/**` no Supabase |
| Loja vazia | Catálogo não sincronizado | Rodar workflow `sync-winget-catalog` no GitHub Actions |
| 401 em APIs | Anonymous Auth desligado | Habilitar em Authentication → Providers |
