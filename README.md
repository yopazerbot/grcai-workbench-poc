# GRC Agent Workbench

A proof-of-concept workbench where GRC analysts work with five AI agents that **draft** compliance work products — questionnaire answers, audit evidence packs, framework coverage mappings, policy review deltas and threat-exposure assessments — from an **anchored knowledge base built out of the organisation's own documents**. The analyst **reviews, edits, approves or rejects** every item. Nothing is final until a human decides, every drafted item cites the document and section it came from, and every action lands in an audit log.

**Runs out of the box with no API key.** Without a Claude key, drafting is served by a built-in simulated engine that reads the same knowledge base the live prompts use — input-aware output, identical shapes, marked with a subtle "Simulated" badge. Each analyst can add **their own Claude API key in the browser** (kept in that tab's session storage, sent per request, never stored on the server) and the same flows are served by Claude — including AI analysis of newly uploaded documents.

> All organisation data is fictional: **Lumeo Software NV**, a ~200-person Belgian B2B SaaS company (contract lifecycle & e-signature platform, Ghent + Namur, Azure-hosted). ISO 27001-certified, SOC 2 Type II in progress, NIS2 important entity, and an ICT third-party provider to banks and insurers — so DORA-driven questionnaires land on its desk.

## What's in the box

| Area | What it does |
| --- | --- |
| **Dashboard** | Framework coverage per framework (ISO 27001 / NIS2 / SOC 2) from the latest mapping runs, evidence freshness across the control register, the review queue, upcoming policy reviews and certificate expiry, knowledge-base health, recent activity |
| **Knowledge base** | Upload PDF / DOCX / Markdown / text. Text is extracted immediately; Claude analyses each document into typed, **section-anchored records** — organisation facts, certifications, controls, policies, past questionnaire answers, assets. Ships with 16 pre-analysed Lumeo documents and 7 simulated connected-system evidence feeds. Re-analyse, delete, or restore the demo set at any time |
| **Five agents** | Questionnaire Responder · Evidence Collector · Control Mapper · Policy Reviewer · Threat Checker — every prompt is built from the knowledge base with `[source: document, §section]` tags, and every drafted item carries a source note |
| **Review loop** | Input → Agent drafts → Analyst reviews → Approve / edit / reject → Output filed (Markdown/JSON, approved items only). Items keep their immutable original next to the edited version |
| **Per-user Claude key** | User menu → *Claude API key*: paste, verify (zero-token `models.list` call), use for the session, forget. Header pill shows which engine serves your next action |
| **Audit log** | Uploads, analyses, inputs, drafts, edits, decisions, exports — attributed, timestamped, and recording which engine (session key / server key / simulated) served each AI action |

## The five agents

| Agent | Input | Output |
| --- | --- | --- |
| **Questionnaire Responder** | Pasted questionnaire | One drafted answer per question, citing the past-answer document or policy it came from; unanswerable questions flagged "unsure", never guessed |
| **Evidence Collector** | Control IDs/names | Evidence pack per control from connected-system snapshots — timestamped items, what-counts notes; missing/stale/partial flagged |
| **Control Mapper** | Framework (ISO 27001 / NIS2 / SOC 2) | One mapping row per requirement: covering controls, full/partial/none, rationale; gaps flagged |
| **Policy Reviewer** | Policy text + change note | Only the delta: current vs proposed text per change, with reasons; uncertain changes flagged |
| **Threat Checker** | Pasted advisory | Exposure conclusion (exposed / not exposed / explicitly undetermined) vs the asset inventory + prioritised draft actions |

The demo story is coherent across agents: the ISO 27001 view is mostly green with surveillance-audit-style findings (incomplete asset ownership, awareness completion 88% vs 95%, the e-signature service descoped from the last DR test), SOC 2 shows first-examination gaps (control monitoring, deletion evidence, an overdue BC/DR plan), and NIS2 has one hard gap — no effectiveness-assessment procedure (Art. 21(2)(f)).

## Quickstart (local, no API key)

Requires **Node 22 or 24** (`better-sqlite3` ships native binaries for both; `engines` pins 22.x for hosted deployments).

```bash
npm install
cp .env.example .env.local        # then set AUTH_SECRET:
npx auth secret                    # or: openssl rand -base64 32
npm run dev
```

Open http://localhost:3000 → **Continue as demo analyst**. The database self-seeds on first request (16 documents, ~130 knowledge records, 7 connected systems, 6 demo runs). To draft with live Claude, open the user menu → **Claude API key** and paste your key.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | ✅ | Session signing secret (`npx auth secret`) |
| `AUTH_URL` | prod | Public URL of the deployment, e.g. `https://grcai.example.com` |
| `DEMO_LOGIN` | — | `true` forces the demo login; it is also auto-enabled whenever Entra isn't configured |
| `AUTH_MICROSOFT_ENTRA_ID_ID` / `_SECRET` / `_ISSUER` | — | Microsoft SSO. Issuer: `https://login.microsoftonline.com/<TENANT_ID>/v2.0` |
| `ANTHROPIC_API_KEY` | — | Optional server-wide key. Per-request precedence: browser session key → this key → simulated engine |
| `ANTHROPIC_MODEL` | — | Default `claude-opus-5` |
| `ANTHROPIC_MAX_TOKENS` | — | Default `32000` |
| `DATABASE_PATH` | — | SQLite file, default `./data/grcai.db` (Railway: `/data/grcai.db`) |

`GET /api/health` needs no session and reports `{status, database, schema, runs, documents, engine}` — use it as the platform healthcheck and as the first stop when a deployment misbehaves.

## How the per-user key works

1. The analyst pastes a key in the **Claude API key** panel. It is written to `sessionStorage` only (cleared when the tab closes) and can be verified with a zero-token call.
2. Every request that may trigger an LLM call (`POST /api/runs`, document upload, `POST /api/documents/:id/analyse`) sends the key in an `X-Anthropic-Key` header.
3. The server uses it for that request and the background job it starts, then drops it. It is never written to the database, logs or audit trail — the audit trail records only *which* engine served the action.
4. If no session key is present the server falls back to `ANTHROPIC_API_KEY` (if set), and otherwise to the simulated engine. Document analysis requires a real key; uploads without one wait as "Awaiting analysis".

## Deploy on Railway

1. Create a Railway service from this repo. Next.js is auto-detected (`npm run build` / `npm run start`, the injected `PORT` is honored) and the Node version comes from `engines`.
2. Attach a **volume** mounted at `/data`, and set `DATABASE_PATH=/data/grcai.db` — documents, run history and the audit log survive restarts and redeploys.
3. Set `AUTH_SECRET`, `AUTH_URL=https://<your-domain>`, and `DEMO_LOGIN=true` for demo mode.
4. Set the service healthcheck path to `/api/health` so only deployments with a working database go live.
5. Optional — Microsoft SSO: create an Entra ID app registration (web platform) with redirect URI `https://<your-domain>/api/auth/callback/microsoft-entra-id`, then set the three `AUTH_MICROSOFT_ENTRA_ID_*` variables.
6. Optional — a shared Claude key: set `ANTHROPIC_API_KEY`. Analysts can still override it with their own session key.

A custom domain works as-is, including proxied through Cloudflare — set `AUTH_URL` to the public domain. Sign-in and redirects are deliberately built on relative navigation, so they survive reverse proxies that rewrite the `Host` header.

## Suggested demo script

1. Sign in → **Dashboard**: ISO 27001 and SOC 2 reviewed, NIS2 mapping in review with one hard gap; evidence freshness shows the DR-test evidence stale and six controls without a connected source; the BC/DR plan and Acceptable Use Policy are overdue for review.
2. **Knowledge base** → open *Information Security Control Register v2.3* → 22 anchored control records; open a questionnaire response → past answers with question anchors. Show the connected systems.
3. User menu → **Claude API key** → paste a key → *Verify & use*. The header pill flips to *Claude · session key*.
4. **Knowledge base** → upload one of your own policies (PDF/DOCX) → watch it move to *Analysed* with extracted records and their anchors. (Without a key it waits as *Awaiting analysis* — the honest state.)
5. **Questionnaire Responder** → sample input → 8 answers citing the Noordbank and Assurix responses, the register and policies; the cyber-insurance question comes back *unsure*. Edit one, approve it, reject the flagged one, *Approve unflagged*, copy/download the export.
6. **Evidence Collector** → sample input → one complete pack (MFA), one **stale** (DR test, ~226 days), one **missing** (supplier security — not a connected system).
7. **Control Mapper** → NIS2 → 10 measures, one gap (effectiveness assessment), partials that echo other agents' findings.
8. **Policy Reviewer** → sample input → three confident diffs (passkeys, Officient leaver flow, Entra Private Access) and one flagged uncertain addition (NIS2 incident-related access decisions).
9. **Threat Checker** → sample advisory → **exposed** via Azure Database for PostgreSQL with a prioritised action plan; paste a GitLab advisory instead → **not exposed**.
10. **Audit log** → every step above, attributed, timestamped, and showing which engine served each AI action.

## Architecture (12 lines)

- **Next.js 15** (App Router) + TypeScript + Tailwind v4; one app serving UI + API route handlers.
- **SQLite** (`better-sqlite3`) with a lazy singleton that creates the schema and seeds on first runtime touch — build never touches the DB. A db created by an older `SCHEMA_VERSION` is wiped and re-seeded (demo store, not a migration target). Journal mode is deliberately `DELETE`, not WAL.
- **Auth.js v5**: Microsoft Entra ID + env-gated demo credentials provider; JWT sessions; relative redirects that survive host-rewriting proxies.
- **Knowledge base** (`lib/documents.ts`, `lib/ingest/*`): `documents` (text, status, summary) + `org_knowledge` records with `document_id` + `anchor`. Upload → `pdf-parse` / `mammoth` text extraction → Claude structured output (`lib/ingest/schema.ts`) → typed records. Connected-system snapshots are seeded separately as simulated integrations.
- **Org context** (`lib/org-context.ts`): rebuilds one typed `OrgData` from the records and renders it into prompt sections with `[source: document, §section]` tags — the same data feeds the simulated generators.
- **Agent registry** (`lib/agents/*`): each agent = input form spec + Zod output schema + prompt builder + item renderer + flag logic + export formatter.
- **LLM routing** (`lib/llm/key.ts`, `lib/llm/client.ts`): per-request key resolution (session header → env → none); one structured-output helper shared by drafting and document analysis; refusal/limit handling and server-side fallbacks.
- **Drafting** (`lib/drafter.ts`): simulated engine (`lib/mock/*`) or Claude, both validated against the agent's schema. Runs process asynchronously in-process; the review screen polls until drafts land.
- **Dashboard** (`lib/dashboard.ts`): posture from the latest mapping run per framework, evidence freshness from `lib/evidence-status.ts` (shared with the Evidence Collector), work queue, dated records.
- **Seed** (`lib/seed/lumeo/*`): `register.ts` is the single source of truth (org, people, stack, 22 controls, 10 policies, certifications); `documents.ts` holds the 16 document texts + their hand-authored extraction records; `connectors.ts` the evidence snapshots; `demo-runs.ts` six backdated runs generated through the real simulated generators.
- Items are immutable-original + editable-current, so "approved · edited" is always reconstructable; all actions write to `audit_log`.
- Framework catalogs (`lib/frameworks.ts`): condensed ISO 27001:2022 / NIS2 / SOC 2 TSC requirement sets with stable IDs.

## Checks

```bash
npm run smoke    # schemas, DB seed, knowledge base, generators vs schemas, ingestion helpers, key resolution, dashboard (add --live for real API calls)
npm run build    # production build
npm run lint
```

## Troubleshooting

- **`GET /api/health`** tells the layers apart: `200 {"status":"ok",...}` means app + database are fine; `500` names the database error; no response means the process itself is down — read the deploy logs.
- On first database touch the server logs `[db] opened <path> (journal="delete")` — if that line is missing, no request has reached the database layer yet. A `[db] schema 1 → 2: resetting demo database` line means an older database was wiped and re-seeded.
- **Uploads stay in "Awaiting analysis"** — no Claude key was available for that request. Add one via the user menu (or set `ANTHROPIC_API_KEY`) and press *Analyse*.
- **A document shows "Failed"** — the error on the card says why (unreadable/scanned PDF, model refusal, rate limit). Fix the input or key and press *Re-analyse*.
- **Segmentation fault on Node 24 (Railway)** — earlier `better-sqlite3` builds crashed on Node 24 on mounted volumes; `engines` pins 22.x for hosted deployments. Local development on Node 24 works.
