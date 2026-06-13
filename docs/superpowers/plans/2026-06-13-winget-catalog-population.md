# WinGet Catalog Population Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Popular o catálogo WinGet no Supabase de produção com metadados oficiais via um sync local rápido e confiável (fonte pré-indexada `index.db` + deep-fetch incremental dos manifests), melhorar os ícones e adequar a UI da loja ao catálogo grande.

**Architecture:** Um script Node local baixa a fonte pré-indexada da Microsoft (`source2.msix` → `Public/index.db` SQLite), lê a lista completa de pacotes (id + versão), deriva o caminho do manifest pela convenção do winget-pkgs e faz deep-fetch do `.locale` oficial apenas para pacotes novos/atualizados, fazendo upsert no mesmo Supabase que a Vercel lê. A camada de ícones resolve o domínio oficial (a partir de `homepage`/`publisher_url`) antes de cair para Wikipedia/genérico. A UI da loja ganha filtros, busca por relevância e ordenação por popularidade.

**Tech Stack:** Node 24 + TypeScript (tsx), `node:sqlite` (SQLite embutido), `adm-zip`, `@supabase/supabase-js`, `yaml`, `node:test`; Next.js 15 (App Router), Supabase Postgres, next-intl.

**Spec:** `[docs/superpowers/specs/2026-06-13-winget-catalog-population-design.md](../specs/2026-06-13-winget-catalog-population-design.md)`

**Convenções de teste do pacote de sync:** os testes ficam em `scripts/sync-winget/*.test.ts` e rodam com o test runner nativo do Node + loader do tsx. Adicionamos o script `test` em `scripts/sync-winget/package.json` (Task 1).

---

# FASE 1 — Fundação de dados

## Task 1: Dependências e schema do pacote de sync

**Files:**

- Modify: `scripts/sync-winget/package.json`

- [ ] **Step 1: Adicionar dependências e script de teste**

Substituir o conteúdo de `scripts/sync-winget/package.json` por:

```json
{
  "name": "sync-winget",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx index.ts",
    "test": "node --import tsx --test ./*.test.ts"
  },
  "dependencies": {
    "@octokit/rest": "^21.1.1",
    "@supabase/supabase-js": "^2.108.1",
    "adm-zip": "^0.5.16",
    "yaml": "^2.8.0"
  },
  "devDependencies": {
    "@types/adm-zip": "^0.5.7",
    "@types/node": "^20.19.0",
    "tsx": "^4.20.3",
    "typescript": "^5.8.3"
  }
}
```

> **Nota de ambiente (atualizado):** usamos o módulo nativo `node:sqlite` (SQLite embutido no Node) em vez de `better-sqlite3`, porque a máquina roda Node 24 (sem binário pré-compilado do `better-sqlite3` e sem toolchain C++). `node:sqlite` não exige instalação nem build. O CI usará Node 24 (Task 11).

- [ ] **Step 2: Instalar dependências**

Run: `npm install` (em `scripts/sync-winget`)
Expected: `node_modules` atualizado com `adm-zip` (puro JS, sem build nativo), sem erros. (SQLite vem do `node:sqlite` embutido — sem dependência externa.)

- [ ] **Step 3: Commit**

```bash
git add scripts/sync-winget/package.json scripts/sync-winget/package-lock.json
git commit -m "chore(sync): add adm-zip and node test script (sqlite via node:sqlite)"
```

---

## Task 2: Migration 005 — novas colunas em `packages`

**Files:**

- Create: `supabase/migrations/005_packages_metadata.sql`
- Modify: `src/lib/packages/types.ts`

- [ ] **Step 1: Escrever a migration**

Criar `supabase/migrations/005_packages_metadata.sql`:

```sql
-- WinStack: metadados oficiais, URLs, popularidade e destaque

alter table public.packages
  add column if not exists homepage text,
  add column if not exists publisher_url text,
  add column if not exists publisher_support_url text,
  add column if not exists license text,
  add column if not exists release_date date,
  add column if not exists tags text[] not null default '{}',
  add column if not exists popularity int not null default 0,
  add column if not exists is_featured boolean not null default false;

create index if not exists packages_popularity_idx
  on public.packages (popularity desc);

-- Recalcula popularidade a partir do uso interno (downloads + favoritos)
create or replace function public.recalc_package_popularity()
returns void as $$
begin
  update public.packages p
  set popularity = coalesce(d.cnt, 0) + coalesce(f.cnt, 0)
  from (
    select pid as package_uuid, count(*) as cnt
    from public.download_history dh, unnest(dh.package_ids) as pid
    group by pid
  ) d
  full outer join (
    select package_id as package_uuid, count(*) as cnt
    from public.favorites
    group by package_id
  ) f on f.package_uuid = d.package_uuid
  where p.id = coalesce(d.package_uuid, f.package_uuid);
end;
$$ language plpgsql;
```

- [ ] **Step 2: Aplicar a migration no Supabase de produção**

Aplicar via Supabase SQL Editor (ou `supabase db push`). Verificar:

Run (SQL Editor): `select column_name from information_schema.columns where table_name = 'packages' order by column_name;`
Expected: lista inclui `homepage`, `publisher_url`, `publisher_support_url`, `license`, `release_date`, `tags`, `popularity`, `is_featured`.

- [ ] **Step 3: Atualizar o tipo `Package`**

Em `src/lib/packages/types.ts`, substituir o tipo `Package` por:

```typescript
export type Package = {
  id: string;
  package_id: string;
  name: string;
  publisher: string;
  description: string;
  description_full: string | null;
  version: string;
  installer_type: string | null;
  categories: string[];
  tags: string[];
  icon_url: string | null;
  moniker: string | null;
  homepage: string | null;
  publisher_url: string | null;
  publisher_support_url: string | null;
  license: string | null;
  release_date: string | null;
  popularity: number;
  is_featured: boolean;
};
```

- [ ] **Step 4: Verificar build do app**

Run: `npm run build` (na raiz)
Expected: build passa (campos novos são opcionais no uso atual).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/005_packages_metadata.sql src/lib/packages/types.ts
git commit -m "feat(db): add official metadata, popularity columns and recalc function"
```

---

## Task 3: Tipo `ParsedPackage` estendido + comparador de versão

**Files:**

- Modify: `scripts/sync-winget/parse-manifest.ts`
- Create: `scripts/sync-winget/version-compare.ts`
- Test: `scripts/sync-winget/version-compare.test.ts`

- [ ] **Step 1: Estender o tipo `ParsedPackage`**

Em `scripts/sync-winget/parse-manifest.ts`, substituir o tipo `ParsedPackage` por:

```typescript
export type ParsedPackage = {
  package_id: string;
  name: string;
  publisher: string;
  description: string;
  description_full: string | null;
  version: string;
  installer_type: string | null;
  categories: string[];
  tags: string[];
  moniker: string | null;
  homepage: string | null;
  publisher_url: string | null;
  publisher_support_url: string | null;
  license: string | null;
  release_date: string | null;
  last_synced_at: string;
};
```

- [ ] **Step 2: Escrever o teste do comparador de versão**

Criar `scripts/sync-winget/version-compare.test.ts`:

```typescript
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { compareVersions, pickLatestVersion } from "./version-compare.js";

test("compareVersions ordena versões numéricas", () => {
  assert.ok(compareVersions("1.2.0", "1.10.0") < 0);
  assert.ok(compareVersions("2.0", "1.9.9") > 0);
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
});

test("compareVersions trata segmentos não numéricos sem quebrar", () => {
  assert.ok(compareVersions("1.0.0-beta", "1.0.0") <= 0 || compareVersions("1.0.0-beta", "1.0.0") >= 0);
});

test("pickLatestVersion devolve a maior versão", () => {
  assert.equal(pickLatestVersion(["1.2.0", "1.10.0", "1.9.0"]), "1.10.0");
  assert.equal(pickLatestVersion([]), null);
});
```

- [ ] **Step 3: Rodar o teste para garantir que falha**

Run: `npm test` (em `scripts/sync-winget`)
Expected: FAIL — `Cannot find module './version-compare.js'`.

- [ ] **Step 4: Implementar o comparador**

Criar `scripts/sync-winget/version-compare.ts`:

```typescript
function segments(version: string): number[] {
  return version
    .split(/[.\-+]/)
    .map((part) => {
      const numeric = Number.parseInt(part.replace(/[^0-9].*$/, ""), 10);
      return Number.isFinite(numeric) ? numeric : 0;
    });
}

export function compareVersions(a: string, b: string): number {
  const sa = segments(a);
  const sb = segments(b);
  const len = Math.max(sa.length, sb.length);

  for (let i = 0; i < len; i += 1) {
    const diff = (sa[i] ?? 0) - (sb[i] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

export function pickLatestVersion(versions: string[]): string | null {
  if (versions.length === 0) return null;
  return versions.reduce((latest, current) =>
    compareVersions(current, latest) > 0 ? current : latest,
  );
}
```

- [ ] **Step 5: Rodar o teste para garantir que passa**

Run: `npm test` (em `scripts/sync-winget`)
Expected: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add scripts/sync-winget/parse-manifest.ts scripts/sync-winget/version-compare.ts scripts/sync-winget/version-compare.test.ts
git commit -m "feat(sync): extend ParsedPackage and add version comparator"
```

---

## Task 4: Download da fonte pré-indexada (`source2.msix`)

**Files:**

- Create: `scripts/sync-winget/download-source.ts`
- Test: `scripts/sync-winget/download-source.test.ts`

- [ ] **Step 1: Escrever o teste das funções puras**

Criar `scripts/sync-winget/download-source.test.ts`:

```typescript
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { SOURCE_URLS } from "./download-source.js";

test("SOURCE_URLS prioriza source2.msix com fallback", () => {
  assert.equal(SOURCE_URLS[0], "https://cdn.winget.microsoft.com/cache/source2.msix");
  assert.ok(SOURCE_URLS.includes("https://cdn.winget.microsoft.com/cache/source.msix"));
});
```

- [ ] **Step 2: Rodar o teste para garantir que falha**

Run: `npm test`
Expected: FAIL — módulo `./download-source.js` não encontrado.

- [ ] **Step 3: Implementar o download**

Criar `scripts/sync-winget/download-source.ts`:

```typescript
import { writeFile } from "node:fs/promises";

export const SOURCE_URLS = [
  "https://cdn.winget.microsoft.com/cache/source2.msix",
  "https://cdn.winget.microsoft.com/cache/source.msix",
];

const MIN_BYTES = 100_000; // sanity: o .msix tem dezenas de MB

export async function downloadSourceMsix(destPath: string): Promise<string> {
  let lastError = "";

  for (const url of SOURCE_URLS) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "WinStack-sync/1.0" },
      });

      if (!response.ok) {
        lastError = `${url} -> HTTP ${response.status}`;
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength < MIN_BYTES) {
        lastError = `${url} -> arquivo muito pequeno (${buffer.byteLength} bytes)`;
        continue;
      }

      await writeFile(destPath, buffer);
      console.log(`Downloaded ${url} (${buffer.byteLength} bytes) -> ${destPath}`);
      return url;
    } catch (error) {
      lastError = `${url} -> ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  throw new Error(`Falha ao baixar a fonte pré-indexada. Última falha: ${lastError}`);
}
```

- [ ] **Step 4: Rodar o teste para garantir que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-winget/download-source.ts scripts/sync-winget/download-source.test.ts
git commit -m "feat(sync): download winget pre-indexed source with fallback"
```

---

## Task 5: Extração do `index.db` do `.msix`

**Files:**

- Create: `scripts/sync-winget/extract-index.ts`
- Test: `scripts/sync-winget/extract-index.test.ts`

- [ ] **Step 1: Escrever o teste (cria um .msix sintético e extrai)**

Criar `scripts/sync-winget/extract-index.test.ts`:

```typescript
import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import AdmZip from "adm-zip";

import { extractIndexDb } from "./extract-index.js";

test("extractIndexDb extrai Public/index.db do container zip", () => {
  const dir = mkdtempSync(join(tmpdir(), "winstack-extract-"));
  const msixPath = join(dir, "source.msix");
  const expected = Buffer.from("SQLite format 3\u0000fake");

  const zip = new AdmZip();
  zip.addFile("Public/index.db", expected);
  zip.addFile("AppxManifest.xml", Buffer.from("<xml/>"));
  zip.writeZip(msixPath);

  const outPath = extractIndexDb(msixPath, dir);
  assert.deepEqual(readFileSync(outPath), expected);
});

test("extractIndexDb falha com mensagem clara se não houver index.db", () => {
  const dir = mkdtempSync(join(tmpdir(), "winstack-extract-"));
  const msixPath = join(dir, "empty.msix");
  const zip = new AdmZip();
  zip.addFile("AppxManifest.xml", Buffer.from("<xml/>"));
  zip.writeZip(msixPath);

  assert.throws(() => extractIndexDb(msixPath, dir), /index\.db/);
});
```

- [ ] **Step 2: Rodar o teste para garantir que falha**

Run: `npm test`
Expected: FAIL — módulo `./extract-index.js` não encontrado.

- [ ] **Step 3: Implementar a extração**

Criar `scripts/sync-winget/extract-index.ts`:

```typescript
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import AdmZip from "adm-zip";

const INDEX_ENTRY_NAMES = ["Public/index.db", "Public\\index.db"];

export function extractIndexDb(msixPath: string, outDir: string): string {
  const zip = new AdmZip(msixPath);
  const entries = zip.getEntries();

  const entry = entries.find((e) =>
    INDEX_ENTRY_NAMES.includes(e.entryName) ||
    e.entryName.toLowerCase().endsWith("public/index.db"),
  );

  if (!entry) {
    throw new Error(
      "Public/index.db não encontrado dentro do .msix (estrutura inesperada da fonte)",
    );
  }

  const outPath = join(outDir, "index.db");
  writeFileSync(outPath, entry.getData());
  return outPath;
}
```

- [ ] **Step 4: Rodar o teste para garantir que passa**

Run: `npm test`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-winget/extract-index.ts scripts/sync-winget/extract-index.test.ts
git commit -m "feat(sync): extract Public/index.db from msix container"
```

---

## Task 6: Leitura defensiva do `index.db`

**Files:**

- Create: `scripts/sync-winget/read-index.ts`
- Test: `scripts/sync-winget/read-index.test.ts`

- [ ] **Step 1: Escrever o teste (cria um index.db sintético)**

Criar `scripts/sync-winget/read-index.test.ts`:

```typescript
import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

import { readIndex } from "./read-index.js";

function buildFixture(dbPath: string): void {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    create table ids (rowid integer primary key, id text);
    create table versions (rowid integer primary key, version text);
    create table manifest (rowid integer primary key, id integer, version integer);
    insert into ids (rowid, id) values (1, '7zip.7zip'), (2, 'Microsoft.VisualStudioCode');
    insert into versions (rowid, version) values (1, '23.01'), (2, '24.09'), (3, '1.80.0');
    insert into manifest (rowid, id, version) values (1, 1, 1), (2, 1, 2), (3, 2, 3);
  `);
  db.close();
}

test("readIndex devolve a maior versão por package_id", () => {
  const dir = mkdtempSync(join(tmpdir(), "winstack-index-"));
  const dbPath = join(dir, "index.db");
  buildFixture(dbPath);

  const entries = readIndex(dbPath).sort((a, b) =>
    a.package_id.localeCompare(b.package_id),
  );

  assert.deepEqual(entries, [
    { package_id: "7zip.7zip", version: "24.09" },
    { package_id: "Microsoft.VisualStudioCode", version: "1.80.0" },
  ]);
});

test("readIndex lança erro claro se faltar tabela esperada", () => {
  const dir = mkdtempSync(join(tmpdir(), "winstack-index-"));
  const dbPath = join(dir, "broken.db");
  const db = new DatabaseSync(dbPath);
  db.exec("create table foo (x integer);");
  db.close();

  assert.throws(() => readIndex(dbPath), /manifest|ids|versions/);
});
```

- [ ] **Step 2: Rodar o teste para garantir que falha**

Run: `npm test`
Expected: FAIL — módulo `./read-index.js` não encontrado.

- [ ] **Step 3: Implementar a leitura**

Criar `scripts/sync-winget/read-index.ts`:

```typescript
import { DatabaseSync } from "node:sqlite";

import { pickLatestVersion } from "./version-compare.js";

export type IndexEntry = {
  package_id: string;
  version: string;
};

function tableExists(db: DatabaseSync, name: string): boolean {
  const row = db
    .prepare("select name from sqlite_master where type='table' and name = ?")
    .get(name);
  return Boolean(row);
}

export function readIndex(dbPath: string): IndexEntry[] {
  const db = new DatabaseSync(dbPath, { readOnly: true });

  try {
    for (const required of ["manifest", "ids", "versions"]) {
      if (!tableExists(db, required)) {
        throw new Error(
          `index.db sem a tabela esperada "${required}" (schema desconhecido — verifique a versão da fonte)`,
        );
      }
    }

    const rows = db
      .prepare(
        `select i.id as package_id, v.version as version
         from manifest m
         join ids i on i.rowid = m.id
         join versions v on v.rowid = m.version`,
      )
      .all() as Array<{ package_id: string; version: string }>;

    const byId = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.package_id) continue;
      const list = byId.get(row.package_id) ?? [];
      list.push(row.version ?? "");
      byId.set(row.package_id, list);
    }

    const entries: IndexEntry[] = [];
    for (const [package_id, versions] of byId) {
      entries.push({ package_id, version: pickLatestVersion(versions) ?? "" });
    }

    return entries;
  } finally {
    db.close();
  }
}
```

- [ ] **Step 4: Rodar o teste para garantir que passa**

Run: `npm test`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-winget/read-index.ts scripts/sync-winget/read-index.test.ts
git commit -m "feat(sync): defensively read package list from index.db"
```

---

## Task 7: Deep-fetch e parse do manifest oficial (`.locale`)

**Files:**

- Create: `scripts/sync-winget/fetch-manifest.ts`
- Test: `scripts/sync-winget/fetch-manifest.test.ts`

- [ ] **Step 1: Escrever o teste das funções puras (path + parse)**

Criar `scripts/sync-winget/fetch-manifest.test.ts`:

```typescript
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { buildManifestDir, parseLocaleManifest } from "./fetch-manifest.js";

test("buildManifestDir segue a convenção do winget-pkgs", () => {
  assert.equal(
    buildManifestDir("Microsoft.VisualStudioCode", "1.80.0"),
    "manifests/m/Microsoft/VisualStudioCode/1.80.0",
  );
  assert.equal(
    buildManifestDir("7zip.7zip", "24.09"),
    "manifests/7/7zip/7zip/24.09",
  );
});

test("parseLocaleManifest extrai metadados oficiais", () => {
  const localeYaml = `
PackageIdentifier: Microsoft.VisualStudioCode
PackageName: Visual Studio Code
Publisher: Microsoft Corporation
ShortDescription: Editor de código leve
Description: Um editor de código leve, porém poderoso.
Moniker: vscode
PackageUrl: https://code.visualstudio.com
PublisherUrl: https://www.microsoft.com
PublisherSupportUrl: https://github.com/microsoft/vscode/issues
License: MIT
ReleaseDate: 2023-07-01
Tags:
  - editor
  - developer-tools
ManifestType: defaultLocale
`;

  const parsed = parseLocaleManifest(localeYaml, {
    package_id: "Microsoft.VisualStudioCode",
    version: "1.80.0",
  });

  assert.equal(parsed.name, "Visual Studio Code");
  assert.equal(parsed.publisher, "Microsoft Corporation");
  assert.equal(parsed.description, "Editor de código leve");
  assert.equal(parsed.description_full, "Um editor de código leve, porém poderoso.");
  assert.equal(parsed.homepage, "https://code.visualstudio.com");
  assert.equal(parsed.publisher_url, "https://www.microsoft.com");
  assert.equal(parsed.license, "MIT");
  assert.equal(parsed.release_date, "2023-07-01");
  assert.deepEqual(parsed.tags, ["editor", "developer-tools"]);
  assert.ok(parsed.categories.includes("developer-tools"));
});

test("parseLocaleManifest usa fallbacks quando faltam campos", () => {
  const parsed = parseLocaleManifest("PackageIdentifier: Foo.Bar\n", {
    package_id: "Foo.Bar",
    version: "2.0",
  });

  assert.equal(parsed.name, "Foo.Bar");
  assert.equal(parsed.publisher, "");
  assert.equal(parsed.description_full, null);
  assert.equal(parsed.homepage, null);
  assert.equal(parsed.version, "2.0");
});
```

- [ ] **Step 2: Rodar o teste para garantir que falha**

Run: `npm test`
Expected: FAIL — módulo `./fetch-manifest.js` não encontrado.

- [ ] **Step 3: Implementar path, parse e fetch**

Criar `scripts/sync-winget/fetch-manifest.ts`:

```typescript
import { parse } from "yaml";

import { mapTagsToCategories, type ParsedPackage } from "./parse-manifest.js";

const RAW_BASE = "https://raw.githubusercontent.com/microsoft/winget-pkgs/master";

type LocaleYaml = {
  PackageName?: string;
  Publisher?: string;
  ShortDescription?: string;
  Description?: string;
  Moniker?: string;
  PackageUrl?: string;
  PublisherUrl?: string;
  PublisherSupportUrl?: string;
  License?: string;
  ReleaseDate?: string | Date;
  Tags?: unknown;
};

type VersionYaml = {
  DefaultLocale?: string;
};

export function buildManifestDir(packageId: string, version: string): string {
  const firstChar = packageId.charAt(0).toLowerCase();
  const segments = packageId.split(".").filter(Boolean);
  return `manifests/${firstChar}/${segments.join("/")}/${version}`;
}

function asString(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

export function parseLocaleManifest(
  localeContent: string,
  ctx: { package_id: string; version: string },
): ParsedPackage {
  const data = (parse(localeContent) as LocaleYaml) ?? {};
  const tags = Array.isArray(data.Tags)
    ? data.Tags.filter((t): t is string => typeof t === "string")
    : [];

  return {
    package_id: ctx.package_id,
    name: asString(data.PackageName) ?? ctx.package_id,
    publisher: asString(data.Publisher) ?? "",
    description: asString(data.ShortDescription) ?? asString(data.Description) ?? "",
    description_full: asString(data.Description),
    version: ctx.version,
    installer_type: null,
    categories: mapTagsToCategories(tags),
    tags,
    moniker: asString(data.Moniker),
    homepage: asString(data.PackageUrl),
    publisher_url: asString(data.PublisherUrl),
    publisher_support_url: asString(data.PublisherSupportUrl),
    license: asString(data.License),
    release_date: asString(data.ReleaseDate),
    last_synced_at: new Date().toISOString(),
  };
}

async function fetchText(url: string, token?: string): Promise<string | null> {
  const headers: Record<string, string> = { "User-Agent": "WinStack-sync/1.0" };
  if (token) headers.Authorization = `token ${token}`;

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function fetchPackageManifest(
  entry: { package_id: string; version: string },
  token?: string,
): Promise<ParsedPackage | null> {
  const dir = buildManifestDir(entry.package_id, entry.version);

  const versionContent = await fetchText(
    `${RAW_BASE}/${dir}/${entry.package_id}.yaml`,
    token,
  );

  let defaultLocale = "en-US";
  if (versionContent) {
    const versionData = parse(versionContent) as VersionYaml;
    if (versionData?.DefaultLocale) defaultLocale = versionData.DefaultLocale;
  }

  const localeContent =
    (await fetchText(
      `${RAW_BASE}/${dir}/${entry.package_id}.locale.${defaultLocale}.yaml`,
      token,
    )) ??
    (await fetchText(
      `${RAW_BASE}/${dir}/${entry.package_id}.locale.en-US.yaml`,
      token,
    ));

  if (!localeContent) return null;

  return parseLocaleManifest(localeContent, entry);
}

export async function fetchManifestsConcurrently(
  entries: Array<{ package_id: string; version: string }>,
  options: { concurrency?: number; token?: string } = {},
): Promise<ParsedPackage[]> {
  const concurrency = options.concurrency ?? 12;
  const results: ParsedPackage[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < entries.length) {
      const current = entries[index];
      index += 1;
      const parsed = await fetchPackageManifest(current, options.token);
      if (parsed) results.push(parsed);
      if (index % 200 === 0) {
        console.log(`Deep-fetch: ${index}/${entries.length}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, entries.length) }, () => worker()),
  );

  return results;
}
```

- [ ] **Step 4: Rodar o teste para garantir que passa**

Run: `npm test`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-winget/fetch-manifest.ts scripts/sync-winget/fetch-manifest.test.ts
git commit -m "feat(sync): deep-fetch and parse official locale manifests"
```

---

## Task 8: Upsert que não sobrescreve dados enriquecidos com null

**Files:**

- Modify: `scripts/sync-winget/upsert-packages.ts`
- Test: `scripts/sync-winget/upsert-packages.test.ts`

**Contexto:** o app preenche `icon_url`/`description_full` via enriquecimento lazy. Ao re-sincronizar, não queremos sobrescrever esses campos com `null`. A função `sanitizePackage` remove chaves `null`/`undefined`/`""` antes do upsert (PostgREST só atualiza colunas presentes no payload).

- [ ] **Step 1: Escrever o teste da sanitização**

Criar `scripts/sync-winget/upsert-packages.test.ts`:

```typescript
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { sanitizePackage } from "./upsert-packages.js";

test("sanitizePackage remove null, undefined e strings vazias", () => {
  const result = sanitizePackage({
    package_id: "Foo.Bar",
    name: "Foo",
    publisher: "",
    description_full: null,
    homepage: undefined as unknown as string | null,
    license: "MIT",
    tags: [],
    version: "1.0",
  });

  assert.deepEqual(result, {
    package_id: "Foo.Bar",
    name: "Foo",
    license: "MIT",
    tags: [],
    version: "1.0",
  });
});

test("sanitizePackage mantém arrays e campos preenchidos", () => {
  const result = sanitizePackage({
    package_id: "A.B",
    categories: ["developer-tools"],
    popularity: 0,
  });

  assert.deepEqual(result.categories, ["developer-tools"]);
  assert.equal(result.popularity, 0);
});
```

- [ ] **Step 2: Rodar o teste para garantir que falha**

Run: `npm test`
Expected: FAIL — `sanitizePackage` não exportada.

- [ ] **Step 3: Implementar a sanitização e usá-la no upsert**

Substituir o conteúdo de `scripts/sync-winget/upsert-packages.ts` por:

```typescript
import { createClient } from "@supabase/supabase-js";

import type { ParsedPackage } from "./parse-manifest.js";

const BATCH_SIZE = 500;

export type UpsertStats = {
  upserted: number;
  errors: number;
};

export function sanitizePackage(
  pkg: Record<string, unknown>,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(pkg)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    clean[key] = value;
  }
  return clean;
}

export async function upsertPackages(
  packages: ParsedPackage[],
): Promise<UpsertStats> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required",
    );
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let upserted = 0;
  let errors = 0;

  for (let offset = 0; offset < packages.length; offset += BATCH_SIZE) {
    const batch = packages
      .slice(offset, offset + BATCH_SIZE)
      .map((pkg) => sanitizePackage(pkg as unknown as Record<string, unknown>));
    const batchNumber = Math.floor(offset / BATCH_SIZE) + 1;

    const { error } = await supabase
      .from("packages")
      .upsert(batch, { onConflict: "package_id" });

    if (error) {
      console.error(`Batch ${batchNumber} failed: ${error.message}`);
      errors += batch.length;
      continue;
    }

    upserted += batch.length;
    console.log(`Batch ${batchNumber}: upserted ${batch.length} packages`);
  }

  return { upserted, errors };
}
```

- [ ] **Step 4: Rodar o teste para garantir que passa**

Run: `npm test`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-winget/upsert-packages.ts scripts/sync-winget/upsert-packages.test.ts
git commit -m "feat(sync): sanitize payload to preserve enriched fields on upsert"
```

---

## Task 9: Diff incremental por versão

**Files:**

- Create: `scripts/sync-winget/select-entries.ts`
- Test: `scripts/sync-winget/select-entries.test.ts`

- [ ] **Step 1: Escrever o teste**

Criar `scripts/sync-winget/select-entries.test.ts`:

```typescript
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { selectEntriesToFetch } from "./select-entries.js";

test("seleciona pacotes novos e com versão alterada", () => {
  const index = [
    { package_id: "A", version: "2.0" },
    { package_id: "B", version: "1.0" },
    { package_id: "C", version: "3.0" },
  ];
  const existing = new Map([
    ["A", "1.0"], // versão mudou -> incluir
    ["B", "1.0"], // igual -> ignorar
  ]);

  const result = selectEntriesToFetch(index, existing).map((e) => e.package_id);
  assert.deepEqual(result.sort(), ["A", "C"]);
});

test("respeita o limite quando fornecido", () => {
  const index = [
    { package_id: "A", version: "1" },
    { package_id: "B", version: "1" },
    { package_id: "C", version: "1" },
  ];
  const result = selectEntriesToFetch(index, new Map(), 2);
  assert.equal(result.length, 2);
});
```

- [ ] **Step 2: Rodar o teste para garantir que falha**

Run: `npm test`
Expected: FAIL — módulo `./select-entries.js` não encontrado.

- [ ] **Step 3: Implementar a seleção**

Criar `scripts/sync-winget/select-entries.ts`:

```typescript
import type { IndexEntry } from "./read-index.js";

export function selectEntriesToFetch(
  indexEntries: IndexEntry[],
  existingVersions: Map<string, string>,
  limit?: number,
): IndexEntry[] {
  const selected = indexEntries.filter((entry) => {
    const existing = existingVersions.get(entry.package_id);
    return existing === undefined || existing !== entry.version;
  });

  if (limit && limit > 0) {
    return selected.slice(0, limit);
  }

  return selected;
}
```

- [ ] **Step 4: Rodar o teste para garantir que passa**

Run: `npm test`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-winget/select-entries.ts scripts/sync-winget/select-entries.test.ts
git commit -m "feat(sync): incremental selection by version diff"
```

---

## Task 10: Orquestrador `index.ts`

**Files:**
- Modify: `scripts/sync-winget/index.ts` (reescrita completa)

- [ ] **Step 1: Reescrever o orquestrador**

Substituir o conteúdo de `scripts/sync-winget/index.ts` por:

```typescript
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { downloadSourceMsix } from "./download-source.js";
import { extractIndexDb } from "./extract-index.js";
import { fetchManifestsConcurrently } from "./fetch-manifest.js";
import { readIndex } from "./read-index.js";
import { selectEntriesToFetch } from "./select-entries.js";
import { upsertPackages } from "./upsert-packages.js";

function getLimit(): number | undefined {
  const flagIndex = process.argv.indexOf("--limit");
  if (flagIndex >= 0 && process.argv[flagIndex + 1]) {
    const parsed = Number.parseInt(process.argv[flagIndex + 1], 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

function requireEnv(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias (apontando para o Supabase de producao)",
    );
  }
  return { url, key };
}

async function fetchExistingVersions(
  url: string,
  key: string,
): Promise<{ versions: Map<string, string>; total: number }> {
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const versions = new Map<string, string>();
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("packages")
      .select("package_id, version")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Falha ao ler versoes atuais: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      versions.set(row.package_id as string, (row.version as string) ?? "");
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return { versions, total: versions.size };
}

async function recalcPopularity(url: string, key: string): Promise<void> {
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.rpc("recalc_package_popularity");
  if (error) {
    console.warn(`Aviso: recalc_package_popularity falhou: ${error.message}`);
  } else {
    console.log("Popularidade recalculada.");
  }
}

async function main(): Promise<void> {
  const { url, key } = requireEnv();
  const limit = getLimit();

  console.log(`Supabase alvo: ${new URL(url).host}`);

  const { versions: existing, total } = await fetchExistingVersions(url, key);
  console.log(`Pacotes atualmente no banco: ${total}`);

  const workDir = mkdtempSync(join(tmpdir(), "winstack-sync-"));

  try {
    const msixPath = join(workDir, "source.msix");
    await downloadSourceMsix(msixPath);

    const dbPath = extractIndexDb(msixPath, workDir);
    const indexEntries = readIndex(dbPath);
    console.log(`Pacotes na fonte pre-indexada: ${indexEntries.length}`);

    const toFetch = selectEntriesToFetch(indexEntries, existing, limit);
    console.log(`Novos/atualizados para deep-fetch: ${toFetch.length}`);

    if (toFetch.length === 0) {
      console.log("Catalogo ja esta atualizado. Nada a fazer.");
      return;
    }

    const packages = await fetchManifestsConcurrently(toFetch, {
      concurrency: 12,
      token: process.env.GITHUB_TOKEN,
    });
    console.log(`Manifests oficiais lidos: ${packages.length}`);

    const exportPath = process.env.SYNC_EXPORT_JSON;
    if (exportPath) {
      writeFileSync(exportPath, JSON.stringify(packages, null, 2), "utf8");
      console.log(`Exportado ${packages.length} pacotes para ${exportPath}`);
      return;
    }

    const stats = await upsertPackages(packages);
    console.log(`Upserted: ${stats.upserted} | Errors: ${stats.errors}`);

    await recalcPopularity(url, key);

    if (stats.errors > 0) process.exitCode = 1;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Sync failed: ${message}`);
  process.exit(1);
});
```

- [ ] **Step 2: Verificar que os testes continuam passando**

Run: `npm test` (em `scripts/sync-winget`)
Expected: PASS (todos os testes das Tasks 3-9).

- [ ] **Step 3: Teste de integracao com limite pequeno**

Garantir que `.env.local` na raiz tem `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` de producao. Rodar:

Run (PowerShell, em `scripts/sync-winget`):
```powershell
$env:SUPABASE_URL=(Select-String -Path ../../.env.local -Pattern '^SUPABASE_URL=').Line.Split('=',2)[1]
$env:SUPABASE_SERVICE_ROLE_KEY=(Select-String -Path ../../.env.local -Pattern '^SUPABASE_SERVICE_ROLE_KEY=').Line.Split('=',2)[1]
npm run start -- --limit 50
```
Expected: loga "Supabase alvo: <host de producao>", baixa o msix, le milhares de pacotes da fonte, deep-fetch de 50 e upsert sem erros.

- [ ] **Step 4: Validar no Supabase**

Run (SQL Editor): `select count(*) from packages where description_full is not null;`
Expected: >= 50 com descricao oficial; checar `Microsoft.VisualStudioCode` com `homepage`, `publisher_url`, `categories` preenchidos.

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-winget/index.ts
git commit -m "feat(sync): orchestrate index.db read + incremental official deep-fetch"
```

- [ ] **Step 6: Execucao completa (full sync)**

Run (com as envs carregadas): `npm run start`
Expected: deep-fetch de todos os pacotes novos (primeira vez ~10-20 min); ao final `count(*)` em milhares.

---

## Task 11: GitHub Action reescrito (fonte leve)

**Files:**
- Modify: `.github/workflows/sync-winget-catalog.yml` (reescrita completa)

- [ ] **Step 1: Reescrever o workflow**

Substituir o conteúdo de `.github/workflows/sync-winget-catalog.yml` por:

```yaml
name: Sync WinGet Catalog

on:
  schedule:
    - cron: "0 3 * * *"
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: npm
          cache-dependency-path: scripts/sync-winget/package-lock.json

      - name: Install sync dependencies
        working-directory: scripts/sync-winget
        run: npm ci

      - name: Run WinGet catalog sync
        working-directory: scripts/sync-winget
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run start

      - name: Sync summary
        if: always()
        run: |
          echo "### WinGet catalog sync" >> "$GITHUB_STEP_SUMMARY"
          echo "- Trigger: ${{ github.event_name }}" >> "$GITHUB_STEP_SUMMARY"
```

- [ ] **Step 2: Garantir lockfile do sync atualizado (necessario para `npm ci`)**

Run: `npm install` (em `scripts/sync-winget`)
Expected: `package-lock.json` coerente com as deps das Tasks 1.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/sync-winget-catalog.yml scripts/sync-winget/package-lock.json
git commit -m "ci(sync): rewrite workflow to use lightweight pre-indexed source"
```

---

## Task 12: Ícones de qualidade (resolução por domínio oficial)

**Files:**
- Create: `src/lib/packages/icon-sources.ts`
- Test: `src/lib/packages/icon-sources.test.ts`
- Modify: `src/lib/packages/enrichment.ts`

- [ ] **Step 1: Escrever o teste das funcoes puras de icone**

Criar `src/lib/packages/icon-sources.test.ts`:

```typescript
import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  domainFromUrl,
  iconCandidatesForDomain,
  resolveIconDomain,
} from "./icon-sources";

test("domainFromUrl extrai o host sem www", () => {
  assert.equal(domainFromUrl("https://www.code.visualstudio.com/docs"), "code.visualstudio.com");
  assert.equal(domainFromUrl("http://7-zip.org"), "7-zip.org");
  assert.equal(domainFromUrl("not-a-url"), null);
});

test("resolveIconDomain prioriza homepage > publisher_url > mapa > heuristica", () => {
  assert.equal(
    resolveIconDomain({
      package_id: "X.Y",
      name: "Y",
      publisher: "Z",
      homepage: "https://product.example.com",
      publisher_url: "https://corp.example.org",
    }),
    "product.example.com",
  );

  assert.equal(
    resolveIconDomain({
      package_id: "Google.Chrome",
      name: "Chrome",
      publisher: "Google LLC",
      homepage: null,
      publisher_url: null,
    }),
    "google.com",
  );
});

test("iconCandidatesForDomain devolve servicos em ordem de qualidade", () => {
  const candidates = iconCandidatesForDomain("vlc.org");
  assert.ok(candidates[0].includes("icon.horse"));
  assert.ok(candidates.some((c) => c.includes("duckduckgo.com")));
  assert.ok(candidates.some((c) => c.includes("google.com/s2/favicons")));
});
```

- [ ] **Step 2: Rodar o teste para garantir que falha**

Run (na raiz): `node --import tsx --test src/lib/packages/icon-sources.test.ts`
Expected: FAIL — modulo `./icon-sources` nao encontrado.

- [ ] **Step 3: Implementar `icon-sources.ts`**

Criar `src/lib/packages/icon-sources.ts`:

```typescript
type IconDomainInput = {
  package_id: string;
  name: string;
  publisher: string;
  homepage?: string | null;
  publisher_url?: string | null;
};

const DOMAIN_MAP: Record<string, string> = {
  "google.chrome": "google.com",
  "mozilla.firefox": "mozilla.org",
  "git.git": "git-scm.com",
  "microsoft.edge": "microsoft.com",
  "microsoft.visualstudiocode": "code.visualstudio.com",
  "microsoft.powershell": "microsoft.com",
  "microsoft.windowsterminal": "microsoft.com",
  "valvesoftware.steam": "steampowered.com",
  "discord.discord": "discord.com",
  "slacktechnologies.slack": "slack.com",
  "spotify.spotify": "spotify.com",
  "zoom.zoom": "zoom.us",
  "notion.notion": "notion.so",
  "obsproject.obsstudio": "obsproject.com",
  "videolan.vlc": "videolan.org",
  "7zip.7zip": "7-zip.org",
  "python.python": "python.org",
  "openjs.nodejs": "nodejs.org",
  "docker.dockerdesktop": "docker.com",
};

export function domainFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function resolveIconDomain(input: IconDomainInput): string | null {
  if (input.homepage) {
    const fromHomepage = domainFromUrl(input.homepage);
    if (fromHomepage) return fromHomepage;
  }

  if (input.publisher_url) {
    const fromPublisher = domainFromUrl(input.publisher_url);
    if (fromPublisher) return fromPublisher;
  }

  const mapped = DOMAIN_MAP[input.package_id.toLowerCase()];
  if (mapped) return mapped;

  const publisherSlug = input.publisher
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corporation|corp|gmbh|software|technologies|team|project)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  if (publisherSlug.length >= 3) return `${publisherSlug}.com`;

  const nameSlug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
  if (nameSlug.length >= 3) return `${nameSlug}.com`;

  return null;
}

export function iconCandidatesForDomain(domain: string): string[] {
  const encoded = encodeURIComponent(domain);
  return [
    `https://icon.horse/icon/${domain}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${encoded}&sz=128`,
  ];
}
```

- [ ] **Step 4: Rodar o teste para garantir que passa**

Run (na raiz): `node --import tsx --test src/lib/packages/icon-sources.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Integrar a nova cadeia no `enrichment.ts`**

Em `src/lib/packages/enrichment.ts`:

1. Adicionar o import no topo:

```typescript
import {
  iconCandidatesForDomain,
  resolveIconDomain,
} from "./icon-sources";
```

2. Remover a constante local `DOMAIN_MAP` e as funcoes `guessPublisherDomain` e `getGoogleFaviconUrl` (migraram para `icon-sources.ts`).

3. Adicionar as funcoes de resolucao validada:

```typescript
async function isImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) return false;
    const type = response.headers.get("content-type") ?? "";
    return type.startsWith("image/");
  } catch {
    return false;
  }
}

async function resolveBestIcon(pkg: Package): Promise<string | undefined> {
  const domain = resolveIconDomain({
    package_id: pkg.package_id,
    name: pkg.name,
    publisher: pkg.publisher,
    homepage: pkg.homepage,
    publisher_url: pkg.publisher_url,
  });

  if (!domain) return undefined;

  for (const candidate of iconCandidatesForDomain(domain)) {
    if (await isImageUrl(candidate)) return candidate;
  }

  return undefined;
}
```

4. Substituir o bloco final de `hydratePackageMetadata`:

```typescript
  if (!result.icon_url && missingIcon) {
    const domain = guessPublisherDomain(pkg.package_id, pkg.name, pkg.publisher);
    result.icon_url = getGoogleFaviconUrl(domain);
  }

  return result;
}
```

por:

```typescript
  if (!result.icon_url && missingIcon) {
    result.icon_url = await resolveBestIcon(pkg);
  }

  return result;
}
```

Manter a Wikipedia para `description_full`; sua thumbnail continua como fallback de icone quando nenhum dominio resolve.

- [ ] **Step 6: Verificar build e lint**

Run (na raiz): `npm run build && npm run lint`
Expected: build e lint passam; nenhuma referencia pendente a `guessPublisherDomain`/`getGoogleFaviconUrl`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/packages/icon-sources.ts src/lib/packages/icon-sources.test.ts src/lib/packages/enrichment.ts
git commit -m "feat(icons): resolve official domain icons with validated fallback chain"
```

---

# FASE 2 — UI da loja

## Task 13: Ordenação e novos filtros nas queries

**Files:**
- Modify: `src/lib/packages/types.ts`
- Modify: `src/lib/packages/queries.ts`

- [ ] **Step 1: Adicionar `sort` aos tipos**

Em `src/lib/packages/types.ts`, substituir o tipo `PackageFilters` por:

```typescript
export type PackageSort = "relevance" | "name" | "recent";

export type PackageFilters = {
  category?: string;
  publisher?: string;
  installer_type?: string;
  sort?: PackageSort;
};
```

- [ ] **Step 2: Aplicar ordenação em `searchPackages` e popularidade em destaques**

Em `src/lib/packages/queries.ts`, substituir o bloco de ordenação/paginação de `searchPackages` (o trecho de `const safePage` até o `.range(from, to)`) por:

```typescript
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sort = filters.sort ?? "relevance";
  if (sort === "name") {
    q = q.order("name", { ascending: true });
  } else if (sort === "recent") {
    q = q.order("release_date", { ascending: false, nullsFirst: false });
  } else {
    // relevance: proxy por popularidade interna, depois nome
    q = q.order("popularity", { ascending: false }).order("name", { ascending: true });
  }

  const { data, count, error } = await q.range(from, to);
```

E substituir `getFeaturedPackages` por ordenação por popularidade:

```typescript
export async function getFeaturedPackages(limit = 6): Promise<Package[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .order("popularity", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`getFeaturedPackages failed: ${error.message}`);
  }

  return (data ?? []) as Package[];
}
```

- [ ] **Step 3: Verificar build**

Run (na raiz): `npm run build`
Expected: build passa.

- [ ] **Step 4: Commit**

```bash
git add src/lib/packages/types.ts src/lib/packages/queries.ts
git commit -m "feat(store): add sort options and popularity-based featured"
```

---

## Task 14: Seletor de ordenação na UI da loja

**Files:**
- Modify: `src/components/store/store-filters.tsx`
- Modify: `src/app/[locale]/store/page.tsx`
- Modify: `messages/pt-BR.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Adicionar chaves i18n de ordenação**

Em `messages/pt-BR.json`, dentro de `store.filters`, adicionar:

```json
"sortLabel": "Ordenar por",
"sortRelevance": "Relevância",
"sortName": "Nome (A–Z)",
"sortRecent": "Mais recentes"
```

Em `messages/en.json`, dentro de `store.filters`, adicionar:

```json
"sortLabel": "Sort by",
"sortRelevance": "Relevance",
"sortName": "Name (A–Z)",
"sortRecent": "Most recent"
```

- [ ] **Step 2: Adicionar o Select de ordenação em `StoreFilters`**

Em `src/components/store/store-filters.tsx`, ampliar `updateFilter` para aceitar a chave `sort` e adicionar um terceiro `Select`. Trocar a assinatura:

```typescript
  const currentSort = searchParams.get("sort") ?? "relevance";

  const updateFilter = (
    key: "category" | "publisher" | "sort",
    value: string | null,
  ) => {
```

E, antes do `</div>` final do componente, adicionar o bloco:

```tsx
      <div className="flex w-full flex-col gap-1.5 sm:w-48">
        <label htmlFor="store-filter-sort" className="text-sm font-medium">
          {t("filters.sortLabel")}
        </label>
        <Select
          value={currentSort}
          onValueChange={(value) => updateFilter("sort", value === "relevance" ? null : value)}
        >
          <SelectTrigger id="store-filter-sort" className="min-h-11 w-full">
            <SelectValue placeholder={t("filters.sortLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">{t("filters.sortRelevance")}</SelectItem>
            <SelectItem value="name">{t("filters.sortName")}</SelectItem>
            <SelectItem value="recent">{t("filters.sortRecent")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
```

- [ ] **Step 3: Propagar `sort` na página da loja**

Em `src/app/[locale]/store/page.tsx`:

1. Adicionar `sort?: string;` ao tipo `searchParams`.
2. Ler `const sort = params.sort as PackageSort | undefined;` (importar `PackageSort` de `@/lib/packages/types`).
3. Passar para a query: `searchPackages(query, { category, publisher, sort }, page)`.
4. Incluir `sort` no `buildHref` de `StorePagination` (adicionar `if (sort) params.set("sort", sort);` e passar `sort` como prop).

Substituir a assinatura/props de `StorePagination` para incluir `sort?: string;` e o `buildHref`:

```typescript
  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (publisher) params.set("publisher", publisher);
    if (sort) params.set("sort", sort);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/store?${qs}` : "/store";
  };
```

- [ ] **Step 4: Verificar build e lint**

Run (na raiz): `npm run build && npm run lint`
Expected: passam; trocar ordenação na loja muda a ordem dos cards e persiste na URL/paginacao.

- [ ] **Step 5: Commit**

```bash
git add src/components/store/store-filters.tsx "src/app/[locale]/store/page.tsx" messages/pt-BR.json messages/en.json
git commit -m "feat(store): sort selector wired through URL and pagination"
```

---

## Task 15: Ícones consistentes no grid

**Files:**
- Modify: `src/components/store/package-icon.tsx`

- [ ] **Step 1: Adicionar lazy-loading e decoding assíncrono**

Em `src/components/store/package-icon.tsx`, no elemento `<img>`, adicionar os atributos `loading="lazy"` e `decoding="async"` e `referrerPolicy="no-referrer"` (este último evita bloqueios de alguns serviços de favicon):

```tsx
        <img
          src={iconUrl!}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-contain p-1.5"
          onError={() => setFailed(true)}
        />
```

- [ ] **Step 2: Verificar build**

Run (na raiz): `npm run build`
Expected: passa.

- [ ] **Step 3: Commit**

```bash
git add src/components/store/package-icon.tsx
git commit -m "perf(store): lazy-load package icons with safe referrer policy"
```

---

## Task 16: Performance de filtros (distinct via RPC)

**Files:**
- Create: `supabase/migrations/006_catalog_facets.sql`
- Modify: `src/lib/packages/queries.ts`

**Contexto:** `getCategories`/`getPublishers` atuais fazem `select` de todas as linhas e deduplicam no Node — inviável com milhares de pacotes. Substituir por funções SQL que retornam valores distintos.

- [ ] **Step 1: Criar as funções de facetas**

Criar `supabase/migrations/006_catalog_facets.sql`:

```sql
-- Facetas distintas para filtros da loja (evita varrer todas as linhas no app)

create or replace function public.distinct_categories()
returns table (category text)
language sql stable as $$
  select distinct unnest(categories) as category
  from public.packages
  order by 1;
$$;

create or replace function public.distinct_publishers(max_rows int default 500)
returns table (publisher text)
language sql stable as $$
  select publisher
  from public.packages
  where coalesce(publisher, '') <> ''
  group by publisher
  order by count(*) desc
  limit max_rows;
$$;
```

- [ ] **Step 2: Aplicar a migration no Supabase**

Aplicar via SQL Editor. Verificar:

Run (SQL Editor): `select count(*) from public.distinct_categories();`
Expected: retorna o número de categorias distintas sem erro.

- [ ] **Step 3: Usar as RPCs em `queries.ts`**

Em `src/lib/packages/queries.ts`, substituir `getCategories` e `getPublishers` por:

```typescript
export async function getCategories(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("distinct_categories");

  if (error) {
    throw new Error(`getCategories failed: ${error.message}`);
  }

  return (data ?? []).map((row: { category: string }) => row.category);
}

export async function getPublishers(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("distinct_publishers", {
    max_rows: 500,
  });

  if (error) {
    throw new Error(`getPublishers failed: ${error.message}`);
  }

  return (data ?? []).map((row: { publisher: string }) => row.publisher);
}
```

- [ ] **Step 4: Verificar build e a loja com catálogo grande**

Run (na raiz): `npm run build`
Expected: build passa; a página da loja carrega filtros rapidamente mesmo com milhares de pacotes.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/006_catalog_facets.sql src/lib/packages/queries.ts
git commit -m "perf(store): compute filter facets via SQL RPC instead of full scan"
```

---

## Verificação final (Fases 1 + 2)

- [ ] **Step 1: Suite de testes do sync**

Run: `npm test` (em `scripts/sync-winget`)
Expected: PASS em todos os testes (Tasks 3–9).

- [ ] **Step 2: Teste de ícones**

Run (na raiz): `node --import tsx --test src/lib/packages/icon-sources.test.ts`
Expected: PASS.

- [ ] **Step 3: Build e lint do app**

Run (na raiz): `npm run build && npm run lint`
Expected: passam.

- [ ] **Step 4: Validação end-to-end**

- `select count(*) from packages` em milhares.
- Loja na Vercel: ícones oficiais, filtros de categoria/publisher, ordenação (relevância/nome/recentes), paginação fluida.

- [ ] **Step 5: Atualizar tracker e histórico**

Atualizar `docs/PROJECT-TRACKER.md` (nova fase concluída) e adicionar entrada em `docs/HISTORY.md` conforme a regra do projeto. Commit.

---

