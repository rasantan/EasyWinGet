# EasyWinGet — Design Spec

**Date:** 2026-06-11  
**Status:** Approved  
**Author:** Brainstorming session with project owner

---

## 1. Summary

EasyWinGet is a free, public web application that democratizes access to Windows software installation via the official WinGet package repository. Users browse a store-like interface, select one or more packages, and download a self-contained, auditable PowerShell script (`.ps1`) that launches a graphical installer on their local machine.

The project serves as a portfolio piece while being a fully functional tool for end users, companies, and people with varying technical skill levels worldwide.

### Goals

- Browse and search the official WinGet catalog with category/type filters
- Select packages like a shopping cart and generate installation scripts
- Anonymous login with persistent favorites, custom bundles, download history, and shareable bundle links
- Bilingual interface (PT-BR + EN) from v1
- Accessible UX/UI using shadcn/ui and WCAG-oriented practices
- Deploy on Vercel, source on GitHub, data/auth on Supabase

### Non-Goals (MVP)

- Community-curated lists and upvoting (schema prepared, not built)
- Code-signed scripts
- Real-time winget CLI execution on the server
- Paid tiers or authentication requiring email/password

---

## 2. Architecture

### Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), TypeScript, shadcn/ui, Tailwind CSS |
| i18n | next-intl (routes `/pt/...` and `/en/...`) |
| Hosting | Vercel (auto-deploy from GitHub) |
| Database & Auth | Supabase (Postgres, Anonymous Auth, RLS) |
| Catalog sync | GitHub Actions (scheduled + manual trigger) |
| Script generation | Next.js API Route |

### System Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   User      │────▶│  Next.js     │────▶│    Supabase     │
│  (browser)  │     │  (Vercel)    │     │  Auth + DB      │
└─────────────┘     └──────┬───────┘     └────────▲────────┘
                           │                       │
                           │ generates .ps1        │ daily sync
                           ▼                       │
                    ┌──────────────┐     ┌─────────┴────────┐
                    │ PS1 Script   │     │  GitHub Action   │
                    │ (local GUI)  │     │  winget-pkgs → DB│
                    └──────┬───────┘     └──────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ winget (PC)  │
                    └──────────────┘
```

### Key Constraint

Vercel serverless functions cannot run `winget` CLI. The catalog must be pre-indexed in Supabase via GitHub Actions that parse manifests from [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs).

---

## 3. Pages & User Flows

### Pages (MVP)

| Route | Purpose |
|-------|---------|
| `/[locale]` | Home — search bar, categories, featured packages |
| `/[locale]/store` | Catalog grid with filters (category, publisher, installer type) |
| `/[locale]/store/[packageId]` | Package detail — description, version, add to selection |
| `/[locale]/cart` | Current selection — review, remove, generate script |
| `/[locale]/bundles` | User's saved bundles, favorites, download history |
| `/[locale]/bundles/[slug]` | Public shared bundle (read-only) |
| `/[locale]/help` | How to run scripts, unblock files, install WinGet |

### Primary Flow (3-step wizard)

1. **Choose** — browse/search, add packages to selection
2. **Review** — confirm list, name bundle (optional), preview script content
3. **Download** — download `.ps1` or copy script to clipboard

### Anonymous Auth Flow

1. On first visit, call `supabase.auth.signInAnonymously()` automatically
2. Create `profiles` row with detected browser locale (`pt-BR` or `en`)
3. Session cookie persists favorites, bundles, and history across visits on same browser
4. Future: optional `linkIdentity()` to Google/GitHub without losing data

---

## 4. Data Model

### `packages`

Indexed WinGet catalog. Written only by GitHub Action (service role).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, default gen_random_uuid() |
| `package_id` | text | WinGet Id, unique (e.g. `Microsoft.PowerToys`) |
| `name` | text | Display name |
| `publisher` | text | Publisher name |
| `description` | text | Short description |
| `description_full` | text | Full description, nullable |
| `version` | text | Latest indexed version |
| `installer_type` | text | exe, msi, msix, etc. |
| `categories` | text[] | Derived tags/categories |
| `icon_url` | text | Nullable; generic fallback in MVP |
| `moniker` | text | Alternative search name |
| `search_vector` | tsvector | Full-text search index |
| `last_synced_at` | timestamptz | Last sync timestamp |

**Indexes:** unique on `package_id`; GIN on `search_vector`; GIN on `categories`.

### `profiles`

One row per auth user (including anonymous).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, FK → auth.users.id |
| `locale` | text | `pt-BR` or `en` |
| `created_at` | timestamptz | default now() |

### `favorites`

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid | FK → profiles.id |
| `package_id` | uuid | FK → packages.id |
| `created_at` | timestamptz | default now() |

**PK:** (`user_id`, `package_id`)

### `bundles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles.id |
| `name` | text | Bundle display name |
| `description` | text | Nullable |
| `slug` | text | Unique URL slug for sharing |
| `is_public` | boolean | default false |
| `locale` | text | `pt-BR` or `en` |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | default now() |

### `bundle_items`

| Column | Type | Notes |
|--------|------|-------|
| `bundle_id` | uuid | FK → bundles.id |
| `package_id` | uuid | FK → packages.id |
| `sort_order` | int | Display/install order |

**PK:** (`bundle_id`, `package_id`)

### `download_history`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles.id |
| `bundle_id` | uuid | FK → bundles.id, nullable |
| `package_ids` | uuid[] | Snapshot of package UUIDs at download time |
| `script_hash` | text | SHA-256 of generated script |
| `created_at` | timestamptz | default now() |

### Row Level Security

| Table | SELECT | INSERT/UPDATE/DELETE |
|-------|--------|----------------------|
| `packages` | Public | Service role only |
| `profiles` | Own row | Own row |
| `favorites` | Own rows | Own rows |
| `bundles` | Own rows + public bundles by slug | Own rows |
| `bundle_items` | Via bundle access | Via bundle owner |
| `download_history` | Own rows | Own rows (insert on download) |

Public bundle read policy: `is_public = true` allows anonymous SELECT on `bundles` and related `bundle_items` + `packages`.

---

## 5. Catalog Sync (GitHub Action)

### Schedule

- **Incremental sync:** daily at 03:00 UTC (manifests changed in last 24h)
- **Full sync:** weekly on Sunday at 04:00 UTC
- **Manual trigger:** `workflow_dispatch` for on-demand sync

### Process

1. Checkout or query GitHub API for changed YAML manifests in `microsoft/winget-pkgs`
2. Parse each manifest: `PackageIdentifier`, `PackageName`, `Publisher`, `PackageVersion`, `ShortDescription`, `Description`, `Tags`, `Moniker`, `Installers[].InstallerType`
3. Normalize categories from Tags (map to store-friendly groups: Developer Tools, Productivity, Utilities, Multimedia, etc.)
4. Upsert rows into `packages` via Supabase service role key (batched, 500 rows per batch)
5. Update `search_vector` via trigger or post-processing
6. Log sync stats (added, updated, errors) as Action summary

### Search on Frontend

- Postgres full-text search on `search_vector`
- Filters: `categories`, `publisher`, `installer_type`
- Pagination: 24 items per page
- Sort: relevance (search), name A-Z, recently synced

### Icons (MVP)

Use a generic category-based icon set. Phase 2 may extract icons from manifests or a community CDN.

---

## 6. Script Generation

### Output Format

Single self-contained `.ps1` file. No hidden external downloads. All package data embedded as JSON at the top of the file.

### Script Structure

```powershell
# ============================================================
# EasyWinGet Install Script
# Generated: {ISO8601} | Bundle: "{name}" | Locale: {locale}
# Packages: {count} | Hash: {sha256}
# ============================================================
# AUDIT: Complete package list below. No hidden operations.
# ============================================================

$EasyWinGetManifest = @'
{
  "version": "1.0",
  "locale": "pt-BR",
  "generated_at": "2026-06-11T12:00:00Z",
  "bundle_name": "Setup Dev",
  "packages": [
    {
      "id": "Git.Git",
      "name": "Git",
      "version": "2.43.0"
    }
  ]
}
'@ | ConvertFrom-Json

# Pre-flight, GUI, and installation logic follows...
```

### Runtime Behavior

1. **Self-unblock:** `Unblock-File -Path $MyInvocation.MyCommand.Path -ErrorAction SilentlyContinue`
2. **Pre-flight checks:**
   - Verify `winget` is available (`Get-Command winget`); if missing, show dialog with Microsoft Store link for App Installer
   - Check PowerShell execution policy; suggest `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` if restricted
3. **GUI (System.Windows.Forms):**
   - Window title: "EasyWinGet Installer"
   - Package list with per-item status: Pending → Installing → Success / Failed
   - Progress bar (overall)
   - Buttons: Install All, Cancel, View Log
   - All UI strings in PT-BR or EN based on manifest `locale`
4. **Installation command per package:**
   ```
   winget install --id {PackageId} -e --accept-source-agreements --accept-package-agreements
   ```
5. **Error handling:** capture exit code; display human-readable message in GUI log; continue or stop based on user preference

### Web Alternatives to Download

- **Download `.ps1`** — primary action; Help page explains unblock steps
- **Copy script** — paste into Notepad, save locally (avoids Mark-of-the-Web for cautious users)
- **Preview** — read-only script preview on Review step before download

### Mark-of-the-Web (MOTW)

Windows marks files downloaded from the internet. Full elimination requires code signing (out of MVP scope). Mitigations:

- Script header documents every action
- `Unblock-File` on self at runtime
- Help page with visual guide (Properties → Unblock)
- Copy-to-clipboard flow avoids MOTW entirely

---

## 7. i18n

### Implementation

- Library: `next-intl`
- Routes: `/pt/...` and `/en/...`
- Language selector in header; persists to `profiles.locale`
- Script locale matches user's selected locale at generation time

### Translation Scope (MVP)

- All UI strings (navigation, buttons, labels, errors)
- Help page content
- Script GUI strings (embedded in generator templates)
- Category names (mapped display names, not raw WinGet tags)

---

## 8. UX/UI Principles

### Accessibility & Democratization

- Minimum font size 16px; WCAG AA contrast ratios
- Icons always paired with text labels
- Clear 3-step wizard: Choose → Review → Download
- Beginner mode (default): simplified language, no raw commands visible
- Advanced mode: show JSON manifest preview and raw winget commands
- Light and dark theme support via shadcn/ui
- Keyboard navigable; semantic HTML; ARIA labels on interactive elements
- Empty states with helpful guidance ("No packages selected — browse the store")
- Error messages in plain language, not error codes alone

### shadcn/ui Components (expected)

- Button, Input, Card, Badge, Dialog, Sheet (mobile cart), Tabs, Select, Skeleton, Toast, DropdownMenu, Command (search palette)

---

## 9. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/script/generate` | POST | Accept package IDs + locale + bundle name; return `.ps1` content + hash; log to download_history |
| `/api/bundles` | GET/POST | CRUD for user bundles |
| `/api/bundles/[slug]` | GET | Public bundle by slug |
| `/api/favorites` | GET/POST/DELETE | Manage favorites |

All user-facing routes validate Supabase session. Script generation validates package IDs exist in catalog.

---

## 10. Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Action only | Catalog sync writes |
| `NEXT_PUBLIC_SITE_URL` | Vercel | Canonical URL for OG/share links |

---

## 11. Repository Structure (planned)

```
easywinget/
├── .github/workflows/
│   └── sync-winget-catalog.yml
├── docs/superpowers/specs/
│   └── 2026-06-11-easywinget-design.md
├── messages/
│   ├── pt-BR.json
│   └── en.json
├── scripts/
│   └── sync-winget/          # Catalog sync script for GitHub Action
├── src/
│   ├── app/[locale]/           # Localized pages
│   ├── components/             # UI components
│   ├── lib/
│   │   ├── supabase/           # Client, server, middleware
│   │   └── script-generator/   # PS1 template engine
│   └── i18n/                   # next-intl config
├── supabase/
│   └── migrations/             # SQL migrations
└── package.json
```

---

## 12. Future Extensions (post-MVP)

Prepared in architecture but not built in v1:

- **`curated_lists`** — admin-authored public lists ("Essentials 2026")
- **`community_picks`** — public bundles with upvotes and moderation
- **OAuth account linking** — upgrade anonymous user to permanent account
- **Code-signed scripts** — reduce SmartScreen warnings
- **Icon enrichment** — per-package icons from manifest metadata
- **/winget export format** — alternative download as JSON export file

---

## 13. Success Criteria (MVP)

- [ ] User can browse/search 1000+ indexed packages with category filters
- [ ] User is anonymously authenticated on first visit without friction
- [ ] User can add packages to cart, save bundle, and share via public link
- [ ] Generated `.ps1` installs selected packages with GUI on Windows 10/11
- [ ] Site works in PT-BR and EN with language switcher
- [ ] Help page guides non-technical users through script execution
- [ ] Deployed on Vercel with Supabase backend and GitHub Action sync running

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large catalog sync is slow | Stale or incomplete data | Incremental daily + full weekly sync |
| MOTW blocks scripts for users | Bad UX for non-technical users | Copy script flow + Help page + Unblock-File |
| WinGet not installed | Script fails silently | Pre-flight check with Store link |
| Anonymous user loses session | Lost bundles | Future OAuth linking; warn that clearing cookies loses data |
| Manifest parsing edge cases | Missing packages | Log errors in Action; skip malformed manifests |

---

*End of spec.*
