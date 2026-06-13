# Spec — Catálogo WinGet: população oficial, schema, ícones e UI da loja

**Data:** 2026-06-13
**Status:** Aprovado (design) — aguardando revisão do spec escrito
**Estrutura:** Um único spec em **2 fases sequenciais** — Fase 1 (Fundação de dados) → Fase 2 (UI da loja).

**Contexto:** O mecanismo atual de popular o banco com pacotes do WinGet não funciona. O GitHub Action de full sync clona o repositório inteiro `microsoft/winget-pkgs` (centenas de milhares de YAMLs) e estoura timeout/falha. Mesmo quando processa, o parser lê o *version manifest* (que só tem `PackageIdentifier`/`PackageVersion`) e não o `*.locale.en-US.yaml`, resultando em pacotes vazios (`name = package_id`, sem publisher/descrição/categorias). Os ícones obtidos via fallback frequentemente não são oficiais. Com o catálogo completo (milhares de pacotes), a UI da loja também precisa de filtros, busca e performance adequados.

---

## 1. Objetivo

Popular a tabela `public.packages` (Supabase de produção) com o catálogo completo do WinGet, com **metadados oficiais** (incluindo descrições, URLs e licença vindas dos manifests oficiais), de forma rápida e confiável por um **comando local** no Windows; melhorar a qualidade dos **ícones**; e adequar a **UI da loja** ao catálogo grande. A aplicação na Vercel apenas lê o Supabase.

### Critérios de sucesso

- `select count(*) from packages` no Supabase de produção passa de ~20 (seed) para o catálogo real (milhares de pacotes).
- `name`, `publisher`, `categories`, `version`, `moniker`, **`description_full`**, **`homepage`/`publisher_url`**, `license`, `tags` preenchidos a partir de fonte oficial do WinGet.
- O sync local termina sem timeout; re-syncs subsequentes são rápidos (só pacotes novos/atualizados).
- O GitHub Action de sync conclui com sucesso usando a mesma fonte.
- Ícones exibidos são majoritariamente o logo oficial do produto.
- A loja exibe ícones consistentes, filtros/categorias úteis, busca por relevância e paginação performática com milhares de itens.

### Fora de escopo

- Mudanças de identidade visual/branding além do necessário para exibir ícones e filtros.
- Autenticação/perfil, bundles e geração de PS1 (já existentes; sem alteração).

---

# FASE 1 — Fundação de dados

## 2. Arquitetura e fluxo de dados

```
[PC Windows]                                      [Nuvem]
npm run sync:winget                               Supabase (produção)
  1. baixa source2.msix (CDN da Microsoft)            tabela: public.packages
  2. extrai Public/index.db (SQLite)            ▲          │
  3. lê lista completa (id, versão, path)       │ upsert   │ leitura (SSR)
  4. deep-fetch do manifest .locale             │          ▼
     (só pacotes novos/atualizados)             │     App na Vercel (somente leitura)
  5. upsert no Supabase ────────────────────────┘
```

**Híbrido elegante:**
- **`index.db`** dá a **lista autoritativa e completa** (package_id, versão mais recente, caminho do manifest) com um único download — rápido e sem clone gigante.
- **Deep-fetch** do `*.locale.<defaultLocale>.yaml` no GitHub raw fornece os **metadados oficiais ricos** (nome, publisher, descrição, tags, URLs, licença, data).
- **Sync incremental por versão:** o `index.db` informa a versão de cada pacote de graça; só fazemos deep-fetch quando o pacote é **novo** ou a **versão mudou** em relação ao que já está salvo. Primeira execução é mais longa (~10–20 min com concorrência limitada); as seguintes são rápidas.

**Garantia de acesso pela Vercel:** o script grava no **mesmo projeto Supabase de produção** que a Vercel lê, via `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` do `.env.local`. No início, loga o host alvo e a contagem atual de `packages` para evitar gravar no banco errado. Não há banco local.

## 3. Fontes de dados

### 3.1 Fonte pré-indexada (`index.db`)

- URL: `https://cdn.winget.microsoft.com/cache/source2.msix` (fallback `source.msix`).
- `.msix` é um ZIP; índice em `Public/index.db` (SQLite). Schema versionado (1.0→2.0) e sujeito a mudança → leitura **defensiva**.
- Extrai por pacote: `package_id` (ids) e `version` (maior). O caminho do manifest é derivado (ver 3.2), não dos `pathparts`.

### 3.2 Manifest oficial (`.locale`) via GitHub raw

- O caminho do manifest é **derivado pela convenção do winget-pkgs** a partir do `package_id` + versão — `manifests/<1ª letra minúscula do id>/<id dividido por '.'>/<versão>/` (ex.: `7zip.7zip` → `manifests/7/7zip/7zip/<versão>/`). Isso é mais robusto que reconstruir via `pathparts` do índice.
- Busca o version manifest `<id>.yaml` (para `DefaultLocale`) e então o `<id>.locale.<DefaultLocale>.yaml`.
- Concorrência limitada (ex.: 10–15 simultâneas) + retries; usar `GITHUB_TOKEN` opcional para folga de rate-limit. Preferir `raw.githubusercontent.com`.
- Extrai: `PackageName`, `Publisher`, `ShortDescription`, `Description`, `Tags`, `Moniker`, `PackageUrl`, `PublisherUrl`, `PublisherSupportUrl`, `License`, `ReleaseDate`.

### Mapeamento → `packages`

| Coluna             | Origem |
|--------------------|--------|
| `package_id`       | index.db `ids` (chave `onConflict`) |
| `version`          | index.db (maior versão) |
| `name`             | locale `PackageName` (fallback id) |
| `publisher`        | locale `Publisher` |
| `description`      | locale `ShortDescription` |
| `description_full` | locale `Description` (oficial) |
| `tags`             | locale `Tags` (brutas) |
| `categories`       | `mapTagsToCategories(Tags)` (reusa atual) |
| `moniker`          | locale `Moniker` / index.db |
| `homepage`         | locale `PackageUrl` |
| `publisher_url`    | locale `PublisherUrl` |
| `license`          | locale `License` |
| `release_date`     | locale/version `ReleaseDate` |
| `installer_type`   | opcional (installer manifest); pode ficar `null` |

Leitura SQLite com **`node:sqlite`** (módulo embutido do Node 24, sem build nativo). Reaproveitar `mapTagsToCategories`.

## 4. Schema — migration `005`

`supabase/migrations/005_packages_metadata.sql`, adicionando colunas (todas nullable, sem quebrar o app):

- `homepage text`
- `publisher_url text`
- `publisher_support_url text`
- `license text`
- `release_date date`
- `tags text[] not null default '{}'`
- `popularity int not null default 0`
- `is_featured boolean not null default false`

Índice opcional para ordenação: `create index packages_popularity_idx on public.packages (popularity desc);`

### Popularidade (interna)

Sem fonte oficial no WinGet. Derivar do uso interno, recalculado após o sync (e/ou via função agendada):

```sql
update public.packages p set popularity = coalesce(sub.cnt, 0)
from (
  select pid as package_uuid, count(*) as cnt
  from public.download_history dh, unnest(dh.package_ids) as pid
  group by pid
) sub
where p.id = sub.package_uuid;
```

Opcionalmente somar contagem de `favorites`. `is_featured` permanece curadoria manual.

## 5. Estrutura do script (`scripts/sync-winget/`)

Reescrever para o novo fluxo, mantendo `upsert-packages.ts`. Novos módulos:

- `download-source.ts` — baixa `source2.msix` (validação + fallback `source.msix`).
- `extract-index.ts` — extrai `Public/index.db` do ZIP (`adm-zip`/`yauzl`).
- `read-index.ts` — abre `index.db` (`node:sqlite`), leitura defensiva → `{ package_id, version }[]`.
- `fetch-manifest.ts` — deep-fetch do `.locale` via raw, com concorrência/retry, → metadados oficiais.
- `index.ts` — orquestra: download → extract → read → diff de versões (busca versões atuais no Supabase) → deep-fetch só dos novos/alterados → upsert → recalcular `popularity` → resumo. Limpa temporários.

### Robustez / modos

- Validar envs e logar host + `count(*)` antes de gravar.
- Erros claros e `exit ≠ 0` em falhas (download, extração, schema inesperado).
- `SYNC_EXPORT_JSON=<path>` (dry-run), `--limit N` (teste rápido).
- **Aposentar** caminhos legados: walk de diretório (`WINGET_PKGS_DIR`) e incremental via GitHub commits (`getChangedManifestPaths`) — causa do timeout.

## 6. GitHub Action (reescrito)

Reescrever `.github/workflows/sync-winget-catalog.yml`:

- Remover o checkout sparse de `winget-pkgs`.
- `schedule` (diário) + `workflow_dispatch` (sem input `full_sync`).
- Passos: checkout → setup Node → `npm ci` → `npm run start` (download `source2.msix` + deep-fetch incremental + upsert). `GITHUB_TOKEN` do próprio Action para rate-limit do raw/API.
- Secrets existentes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. `timeout-minutes` reduzido (ex.: 60).

## 7. Ícones de qualidade (cadeia de fallback, sem chave de API)

Melhorar `src/lib/packages/enrichment.ts`, pipeline **lazy** + cache no Supabase. Agora com URLs oficiais no banco a resolução melhora muito.

**Causa atual:** `guessPublisherDomain` adivinha domínio cru (`slugPublisher + ".com"`); thumbnail da Wikipedia costuma não ser logo; Google `sz=128` vem upscaled.

**Nova ordem (por confiança):**
1. **Domínio do `homepage`/`publisher_url`** (oficial, vindo do manifest) → extrair host.
2. `DOMAIN_MAP` curado (expandir ~50–100) e heurística do `PackageIdentifier` como reforço.
3. Ícone via serviço de melhor qualidade (`icon.horse/icon/<domain>`; fallback DuckDuckGo `ip3` e Google `sz=128`).
4. Wikipedia passa a servir **prioritariamente a descrição** quando faltar; thumbnail só vira ícone em último caso.
5. Genérico por categoria (lucide na UI) como último recurso.

Validar resposta (2xx + content-type de imagem) antes de cachear, para não persistir ícone quebrado.

---

# FASE 2 — UI da loja

## 8. Exibição de ícones

- Componente de ícone (`PackageIcon`) com tamanho/proporção consistentes, `loading="lazy"`, fundo neutro e fallback por categoria; tratar imagens quebradas (onError → genérico).

## 9. Filtros e categorias

- Filtros robustos para catálogo grande: categoria, publisher, `installer_type`, e tags. Contagens por faceta quando viável.
- Categorias derivadas de `categories` (já mapeadas); permitir múltipla seleção.

## 10. Busca por relevância

- Busca full-text usando `search_vector` (já existe) com ranking; ordenações: relevância, nome, **popularidade** (`popularity desc`), mais recentes (`release_date`/`last_synced_at`).
- Debounce já existente; manter via URL params.

## 11. Performance com milhares de itens

- Paginação por keyset/offset eficiente (24/página já existe); evitar `count(*)` caro em toda página (usar contagem aproximada/`head` quando possível).
- Índices: `packages_popularity_idx`; reuso de `search_idx`/`categories_idx`. Skeletons e SSR já presentes.

---

## 12. Dependências novas

- `adm-zip` — dependency de `scripts/sync-winget` (puro JS). SQLite via `node:sqlite` embutido (sem dependência externa).
- Sem dependências novas no app Next.js (mudanças de ícone/UI são lógica + componentes existentes).

## 13. Testes / verificação

- Unidade: mapeamento `index.db → lista`, `fetch-manifest → metadados`, resolução de domínio/ícone (Chrome, VS Code, 7-Zip, desconhecido).
- Integração manual: `npm run sync:winget -- --limit 50` → conferir no Supabase; depois full → `count(*)` em milhares com campos oficiais; loja na Vercel com ícones/filtros/busca/popularidade.
- `npm run build` e `npm run lint` passando.

## 14. Riscos e mitigações

| Risco | Mitigação |
|------|-----------|
| Schema do `index.db` muda | Leitura defensiva; erro claro; pin de schema conhecido. |
| Rate-limit no deep-fetch de manifests | Concorrência limitada + retry + `GITHUB_TOKEN`; incremental por versão reduz volume. |
| Leitor SQLite sem build nativo | Usar `node:sqlite` embutido (Node 24, sem instalação/compilação); CI também em Node 24. |
| Script aponta para Supabase errado | Log de host + `count(*)` antes do upsert. |
| Serviço de favicon fora do ar | Cadeia com múltiplos fallbacks + genérico por categoria. |
| Popularidade sem fonte oficial | Derivada de `download_history`/`favorites`; `is_featured` curado. |
| `count(*)` caro com catálogo grande | Contagem aproximada/keyset; índices adequados. |
