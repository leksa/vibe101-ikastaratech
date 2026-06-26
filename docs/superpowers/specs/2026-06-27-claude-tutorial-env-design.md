# Design: Claude Code Tutorial Environment — SPPG Coverage Dashboard

Date: 2026-06-27
Status: Approved (design), pending spec review

## Goal

Turn this working-but-messy project into a clean, presentable **Claude Code tutorial
environment**. Three outcomes:

1. A correct, idiomatic Claude "vibe coding" ecosystem (CLAUDE.md, skills, MCP, docs
   reference, diagnostic gate) that actually functions for this project.
2. The existing SPPG coverage dashboard restructured into `backend/frontend/infrastructure`,
   still running against the live Postgres DB, with bugs fixed and unit tests added.
3. An HTML slide deck (`presentation/index.html`) the user presents from.

## Context (current state)

- Working app in `dashboard/`: Vue 3 + Vite + Tailwind frontend, Express + `pg` backend,
  served together (express serves `dist/` in prod; vite dev `:5173` proxies `/api` → `:3000`).
- Live Postgres `sppg-db` container on `:5435`, db `sppg`, populated:
  `sppg` 24,264 rows · `dapodik_pd` 7,283 · `kecamatan_mapping` 5,472 · `kecamatan_coords` 5,466
  · `district_coords` present.
- Domain: compare count of SPPG kitchens (Satuan Pelayanan Pemenuhan Gizi) vs student
  recipient population (DAPODIK PAUD+SD) per kecamatan → coverage % → red/yellow/green tiers.
- Root is cluttered: duplicate intermediate CSVs, `.playwright-mcp/` dumps, `__pycache__`,
  `.DS_Store`, multiple scraper versions.
- Installed plugins: superpowers, typescript-lsp, rust-analyzer-lsp, playwright,
  code-simplifier, frontend-design, security-guidance, caveman. **No** code-review-graph.

## Decisions (from brainstorming)

| Topic | Decision |
|-------|----------|
| Restructure | Split `dashboard/` into `backend/` + `frontend/` + `infrastructure/`; keep app running. |
| Backend language | Keep Node/Express. Author NEW project skills in Node/Express flavor (not Go). |
| code-review-graph | `pip install` + wire into project `.mcp.json` now. |
| Slide terminal output | Marked `<img>` placeholder slots; user fills real screenshots. Prompt examples = styled text. |
| Cleanup | Move all cruft to `_archive/` (recoverable, no `rm`; repo is not git). |
| Building-journey slides | Start at the existing Postgres DB. Scrape covered verbally by presenter (one-line mention only). |

## Target structure

```
data-bgn/
├── CLAUDE.md                  # project map + agent rules + diagnostic gate
├── .mcp.json                  # code-review-graph MCP
├── .claude/
│   ├── skills/                # node-express-api, vue-dashboard-ui, sppg-data-pipeline, db-migrations
│   └── settings.json          # hook reminders for the diagnostic gate
├── backend/                   # from dashboard/api + server.js
│   ├── server.js  api/db.js  api/routes.js  package.json
│   └── tests/                 # node:test unit tests
├── frontend/                  # from dashboard/src + vite/tailwind/postcss config + index.html
│   └── src/...  package.json
├── infrastructure/
│   ├── docker-compose.yml     # postgres sppg-db :5435
│   ├── nginx/sppg.conf
│   └── README.md
├── script/                    # scrapers, clean_and_remap.py, run_pipeline.sh, *.sql
├── docs/
│   ├── reference/             # dapodik_pd_kecamatan.csv + sppg_indonesia_2026.csv (the 2 keepers)
│   ├── code-standards.md  business-process.md  SRS.md  deployment-rules.md
│   ├── diagrams/              # flow.mmd (mermaid) + erd.mmd
│   └── superpowers/specs/     # this file
├── presentation/index.html
└── _archive/                  # cruft
```

Dev flow unchanged: compose DB → backend `:3000` → frontend vite `:5173` (proxy `/api`).
Prod: backend serves `../frontend/dist`.

## Claude ecosystem pieces

- **CLAUDE.md**: project map, data flow, the magic `2000 porsi/SPPG/day` constant documented,
  and a hard **diagnostic gate**: after any code write → (1) LSP diagnostics, (2) unit tests
  (`node --test`), only then (3) browser/playwright test.
- **4 project skills** (Node/Express): `node-express-api`, `vue-dashboard-ui`,
  `sppg-data-pipeline`, `db-migrations`.
- **.mcp.json**: `code-review-graph` for code-development tracking.
- **docs/reference**: code & dev standards, business process, SRS, mermaid flow + ERD,
  deployment rules.

## Bug audit (fix + cover with tests)

1. **Schema drift** — `setup_db.sql` never creates `kecamatan_coords` / `district_coords`;
   a fresh setup fails. Add them.
2. **Suspect COPY column order** in `import_data.sql` — `sma,smk,slb,sd,smp` ordering vs the
   CSV header may land `sd`/`smp` counts in wrong columns. Verify against the CSV header, fix.
3. **Missing `try/catch`** on `GET /sppg` → silent failure on DB error.
4. **Dirty-data filter** `NOT SIMILAR TO '[0-9]+%'` copy-pasted across ~8 queries →
   centralize in a clean view and/or fix at import.
5. **Magic `2000`** coverage constant undocumented → name + document.

Full audit during implementation; every fix gets a unit test.

## Slide deck

`presentation/index.html` — self-contained (inline CSS/JS), keyboard nav, ~9–10 slides:

1. Intro (1).
2. Claude env structure (3): folder layout / CLAUDE.md + skills / MCP + diagnostic gate.
3. Building journey (4): DB foundation (schema + ERD + views) → backend API (coverage SQL,
   tier logic, the 2000 constant) → frontend dashboard (Leaflet map, coverage tiers) →
   diagnostic loop + code-review-graph in action.
4. Closing (2): placeholders, content TBD with presenter.

Terminal output = `<img>` placeholder slots filled by presenter. Prompt examples = styled text.

## Risks & sequencing

- Restructure is the riskiest step → after moving files, verify the full chain boots
  (DB → backend → frontend → browser) before continuing.
- No git → cleanup goes to `_archive/`, never `rm`.
- `code-review-graph` pip install touches the user's python env (approved).
