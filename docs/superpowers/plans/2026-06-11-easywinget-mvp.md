# EasyWinGet MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Progress tracking:** Mirror all task completion in [`docs/PROJECT-TRACKER.md`](../../PROJECT-TRACKER.md). Append session work to [`docs/HISTORY.md`](../../HISTORY.md). Rule: `.cursor/rules/project-tracking.mdc`.

**Goal:** Build a bilingual WinGet package store where users anonymously browse, select packages, save/share bundles, and download self-contained PowerShell install scripts with a local GUI.

**Architecture:** Next.js on Vercel reads a pre-indexed WinGet catalog from Supabase. GitHub Actions sync manifests from microsoft/winget-pkgs. Anonymous Supabase auth persists user data. API route generates auditable `.ps1` scripts with embedded JSON manifest and WinForms UI.

**Tech Stack:** Next.js 15, TypeScript, shadcn/ui, Tailwind, next-intl, Supabase (@supabase/ssr), GitHub Actions, Vercel

**Spec:** [`docs/superpowers/specs/2026-06-11-easywinget-design.md`](../specs/2026-06-11-easywinget-design.md)

---

## File Structure (target)

```
easywinget/
├── .cursor/rules/project-tracking.mdc
├── .github/workflows/sync-winget-catalog.yml
├── docs/
│   ├── PROJECT-TRACKER.md
│   ├── HISTORY.md
│   └── superpowers/{specs,plans}/
├── messages/
│   ├── pt-BR.json
│   └── en.json
├── scripts/sync-winget/
│   ├── index.ts
│   ├── parse-manifest.ts
│   └── upsert-packages.ts
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                    # Home
│   │   │   ├── store/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [packageId]/page.tsx
│   │   │   ├── cart/page.tsx
│   │   │   ├── bundles/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   └── help/page.tsx
│   │   └── api/
│   │       ├── script/generate/route.ts
│   │       ├── favorites/route.ts
│   │       └── bundles/[slug]/route.ts
│   ├── components/
│   │   ├── layout/{header,footer,locale-switcher}.tsx
│   │   ├── store/{package-card,search-bar,filters}.tsx
│   │   ├── cart/{cart-item,review-step,download-step}.tsx
│   │   └── ui/                             # shadcn
│   ├── lib/
│   │   ├── supabase/{client,server,middleware}.ts
│   │   ├── script-generator/
│   │   │   ├── template.ps1.ts
│   │   │   └── generate.ts
│   │   └── cart-store.ts                   # Zustand
│   ├── i18n/{routing,request}.ts
│   └── middleware.ts
├── supabase/migrations/
│   ├── 001_packages.sql
│   ├── 002_user_tables.sql
│   └── 003_rls_policies.sql
└── package.json
```

---

## Phase 0 — Scaffold

### Task 0.1: Create Next.js app

**Files:**
- Create: project root via `create-next-app`

```bash
cd C:\Users\SILIBRINA\Desktop\EasyWinGet
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Expected: `package.json`, `src/app/layout.tsx`, `tailwind.config.ts` exist.

Update tracker: **0.1** → `[x]`

---

### Task 0.2: Install shadcn/ui

```bash
npx shadcn@latest init -d
npx shadcn@latest add button input card badge dialog sheet tabs select skeleton toast dropdown-menu command
```

**Files:**
- Create: `components.json`, `src/components/ui/*`

Configure `src/app/globals.css` with accessible base font-size (16px) and WCAG-friendly theme tokens.

Update tracker: **0.2** → `[x]`

---

### Task 0.3: Configure next-intl

**Files:**
- Create: `src/i18n/routing.ts`, `src/i18n/request.ts`, `messages/pt-BR.json`, `messages/en.json`
- Modify: `src/middleware.ts`, `next.config.ts`

`src/i18n/routing.ts`:

```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['pt-BR', 'en'],
  defaultLocale: 'pt-BR',
  localePrefix: 'always',
});
```

`src/middleware.ts` — chain Supabase middleware (Phase 1) after intl middleware.

Move pages under `src/app/[locale]/`.

Update tracker: **0.3**, **0.4** → `[x]`

---

### Task 0.4–0.7: Layout, README, env

**Files:**
- Create: `src/components/layout/header.tsx`, `footer.tsx`, `locale-switcher.tsx`
- Create: `src/app/[locale]/layout.tsx` with Header + Footer
- Create: `.env.example`, `README.md`

`.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Update tracker: **0.5**, **0.6**, **0.7** → `[x]`

---

## Phase 1 — Supabase

### Task 1.1: Supabase project setup

1. Create project at supabase.com
2. Authentication → Providers → enable **Anonymous sign-ins**
3. Copy URL and anon key to `.env.local`

Update tracker: **1.1** → `[x]`

---

### Task 1.2: Migration — packages

**Files:**
- Create: `supabase/migrations/001_packages.sql`

```sql
create extension if not exists pg_trgm;

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  package_id text not null unique,
  name text not null,
  publisher text not null default '',
  description text not null default '',
  description_full text,
  version text not null default '',
  installer_type text,
  categories text[] not null default '{}',
  icon_url text,
  moniker text,
  search_vector tsvector,
  last_synced_at timestamptz not null default now()
);

create index packages_search_idx on public.packages using gin (search_vector);
create index packages_categories_idx on public.packages using gin (categories);
create index packages_name_trgm_idx on public.packages using gin (name gin_trgm_ops);

create or replace function public.packages_search_vector_update()
returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.publisher, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.moniker, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.description, '')), 'C');
  return new;
end;
$$ language plpgsql;

create trigger packages_search_vector_trigger
  before insert or update on public.packages
  for each row execute function public.packages_search_vector_update();
```

Apply: `supabase db push` or run in SQL editor.

Update tracker: **1.2** → `[x]`

---

### Task 1.3–1.5: User tables, RLS, profile trigger

**Files:**
- Create: `supabase/migrations/002_user_tables.sql`
- Create: `supabase/migrations/003_rls_policies.sql`

Key RLS policies:

```sql
-- packages: public read
alter table public.packages enable row level security;
create policy "packages_public_read" on public.packages for select using (true);

-- profiles: own row only
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- bundles public read by slug
create policy "bundles_public_read" on public.bundles for select
  using (is_public = true or auth.uid() = user_id);
```

Profile auto-create trigger on `auth.users` insert.

Update tracker: **1.3**, **1.4**, **1.5** → `[x]`

---

### Task 1.6–1.7: Supabase SSR + anonymous auth middleware

**Files:**
- Create: `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`

Pattern from `@supabase/ssr` docs for Next.js App Router.

In middleware, if no session:

```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  await supabase.auth.signInAnonymously();
}
```

Update tracker: **1.6**, **1.7** → `[x]`

---

### Task 1.8: Dev seed (optional)

**Files:**
- Create: `supabase/seed.sql` with ~20 known packages (Git.Git, Microsoft.PowerToys, etc.)

Update tracker: **1.8** → `[x]`

---

## Phase 2 — Catalog Sync

### Task 2.1–2.3: Sync script + GitHub Action

**Files:**
- Create: `scripts/sync-winget/index.ts`
- Create: `.github/workflows/sync-winget-catalog.yml`

Sync script responsibilities:
1. Fetch changed files from `microsoft/winget-pkgs` via GitHub API (incremental) or clone (full)
2. Parse YAML manifests with `yaml` package
3. Extract: PackageIdentifier, PackageName, Publisher, PackageVersion, ShortDescription, Tags, Moniker, InstallerType
4. Map Tags → store categories (DeveloperTools → `developer-tools`, etc.)
5. Upsert to Supabase in batches of 500 using service role key

Workflow triggers:

```yaml
on:
  schedule:
    - cron: '0 3 * * *'      # daily incremental
    - cron: '0 4 * * 0'      # weekly full (Sunday)
  workflow_dispatch:
```

Update tracker: **2.1**–**2.7** → `[x]` as each completes

---

## Phase 3 — Store UI

### Task 3.1–3.9: Pages and components

**Key queries (server component):**

```typescript
// src/lib/packages/queries.ts
export async function searchPackages(query: string, filters: PackageFilters, page: number) {
  const supabase = await createClient();
  let q = supabase.from('packages').select('*', { count: 'exact' });

  if (query) q = q.textSearch('search_vector', query, { type: 'websearch', config: 'simple' });
  if (filters.category) q = q.contains('categories', [filters.category]);
  if (filters.publisher) q = q.eq('publisher', filters.publisher);

  return q.order('name').range((page - 1) * 24, page * 24 - 1);
}
```

**Cart state (`src/lib/cart-store.ts`):**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type CartStore = {
  items: PackageSummary[];
  add: (pkg: PackageSummary) => void;
  remove: (packageId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (pkg) => set({ items: [...get().items.filter(i => i.package_id !== pkg.package_id), pkg] }),
      remove: (id) => set({ items: get().items.filter(i => i.package_id !== id) }),
      clear: () => set({ items: [] }),
    }),
    { name: 'easywinget-cart' }
  )
);
```

Update tracker tasks **3.1**–**3.9** as completed.

---

## Phase 4 — Bundles & Sharing

### Task 4.1: Favorites API

**Files:**
- Create: `src/app/api/favorites/route.ts`

```typescript
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('favorites')
    .select('*, packages(*)')
    .eq('user_id', user.id);

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { package_id } = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('favorites').upsert({ user_id: user.id, package_id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
```

Slug generation for bundles: `slugify(name)-{nanoid(6)}`.

Update tracker: **4.1**–**4.9** → `[x]` as completed.

---

## Phase 5 — Script Generation

### Task 5.1: PS1 template engine

**Files:**
- Create: `src/lib/script-generator/template.ps1.ts`
- Create: `src/lib/script-generator/generate.ts`

`generate.ts` builds a string containing:
1. Header comments (audit block)
2. `$EasyWinGetManifest` JSON (packages array)
3. Embedded PowerShell: Unblock-File, winget check, WinForms GUI, install loop

GUI strings map:

```typescript
const GUI_STRINGS = {
  'pt-BR': {
    title: 'EasyWinGet — Instalador',
    installAll: 'Instalar todos',
    cancel: 'Cancelar',
    viewLog: 'Ver log',
    confirm: 'Deseja instalar {count} aplicativo(s)?',
    wingetMissing: 'WinGet não encontrado. Instale o App Installer pela Microsoft Store.',
  },
  en: { /* ... */ },
};
```

### Task 5.3: Generate API

**Files:**
- Create: `src/app/api/script/generate/route.ts`

```typescript
export async function POST(request: Request) {
  const { package_ids, locale, bundle_name } = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: packages } = await supabase
    .from('packages')
    .select('package_id, name, version')
    .in('id', package_ids);

  if (!packages?.length) return NextResponse.json({ error: 'No packages' }, { status: 400 });

  const script = generateScript({ packages, locale, bundle_name });
  const hash = createHash('sha256').update(script).digest('hex');

  await supabase.from('download_history').insert({
    user_id: user.id,
    package_ids,
    script_hash: hash,
  });

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="easywinget-install.ps1"`,
      'X-Script-Hash': hash,
    },
  });
}
```

### Task 5.7: Manual Windows test checklist

1. Generate script with Git.Git + 7zip.7zip
2. Right-click → Run with PowerShell
3. Verify GUI opens, packages listed, install succeeds
4. Verify manifest JSON at top matches selection

Update tracker: **5.1**–**5.7** → `[x]` as completed.

---

## Phase 6 — Help, Deploy, Polish

### Task 6.1: Help page content (both locales)

Sections:
- O que é o EasyWinGet / What is EasyWinGet
- Como baixar e executar o script
- Como desbloquear arquivo (MOTW) — step-by-step with numbered list
- Como instalar WinGet (App Installer link)
- Alternativa: copiar script para Bloco de Notas

### Task 6.4–6.5: Vercel deploy

1. Push to GitHub
2. Import in Vercel
3. Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
4. Add Supabase redirect URL for production domain

Update tracker: **6.1**–**6.7** → `[x]` as completed.

---

## Spec Coverage Checklist

| Spec requirement | Plan task(s) |
|------------------|--------------|
| WinGet official catalog | Phase 2 |
| Anonymous auth | Phase 1 (1.1, 1.6, 1.7) |
| Favorites, bundles, history, share links | Phase 4 |
| PT + EN i18n | Phase 0 (0.3, 0.4) |
| shadcn/ui accessible UX | Phase 0 (0.2), Phase 6 (6.6) |
| Self-contained PS1 with GUI | Phase 5 |
| Copy script alternative | Phase 5 (5.6) |
| Help page MOTW/WinGet | Phase 6 (6.1) |
| Vercel + GitHub + Supabase | Phases 0, 1, 2, 6 |

---

## Session Workflow (mandatory)

1. **Start:** Read `docs/PROJECT-TRACKER.md` → pick next `[ ]` task in current phase
2. **Work:** Implement per plan; mark task `[~]` while in progress
3. **Done:** Mark `[x]` in tracker; update progress counter
4. **End:** Append entry to `docs/HISTORY.md`
5. **New tasks:** Add to Backlog in tracker; note in HISTORY

---

## Execution Options

**Plan saved to:** `docs/superpowers/plans/2026-06-11-easywinget-mvp.md`

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks

**2. Inline Execution** — execute tasks in this session with checkpoints

Which approach do you prefer?
