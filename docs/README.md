# MERT Equipment Portal — Documentation Hub

Start here. These docs are the **source of truth for project context**. Any
person or AI agent working on this repo must read the "Required reading" list
before changing anything, and must update the docs as part of the same change.

## Required reading (in order)

1. [STATUS.md](STATUS.md): where the project is right now, what's next, and known issues.
2. [architecture/OVERVIEW.md](architecture/OVERVIEW.md): the stack, the folder layout and the request flows.
3. [database/SCHEMA.md](database/SCHEMA.md): every table, view and enum.
4. [database/BUSINESS_LOGIC.md](database/BUSINESS_LOGIC.md): the FEFO rules, how submissions are processed, and the alerts engine.
5. [architecture/SECURITY.md](architecture/SECURITY.md): the access model (shared admin login plus a member PIN).

## Reference

| Doc | Purpose |
| --- | --- |
| [ROADMAP.md](ROADMAP.md) | Phased feature plan with checkboxes |
| [DECISIONS.md](DECISIONS.md) | Architecture Decision Records (why things are the way they are) |
| [CHANGELOG.md](CHANGELOG.md) | Dated log of notable changes |
| [operations/LOCAL_DEV.md](operations/LOCAL_DEV.md) | Running the app and database locally |
| [operations/ENVIRONMENT.md](operations/ENVIRONMENT.md) | Every env var: what it is and where to get it |
| [operations/DEPLOYMENT.md](operations/DEPLOYMENT.md) | Supabase and Vercel production setup, plus admin bootstrap |
| [product/REQUIREMENTS.md](product/REQUIREMENTS.md) | Original requirements and the clarified answers from the owner |

---

## Doc maintenance protocol (keep these docs self-sustaining)

The rules below are mandatory for every contributor, human or agent.

1. **Update docs in the same change as the code.** A PR or task is not done until the relevant docs match reality.
2. **What to update when:**

   | You changed... | Update |
   | --- | --- |
   | Any SQL migration (table, column, enum, view, function, policy) | `database/SCHEMA.md` and/or `database/BUSINESS_LOGIC.md`, `architecture/SECURITY.md` if grants or RLS changed, and `src/types/domain.ts` |
   | Folder layout, a new route, or a new lib module | `architecture/OVERVIEW.md` (file tree and routes table) |
   | An env var | `.env.example`, `src/lib/env.ts`, `operations/ENVIRONMENT.md` |
   | Finished or started a roadmap item | `ROADMAP.md` checkbox, `STATUS.md` "Current state" and "Next up" |
   | A non-obvious design choice or tradeoff | Add an ADR to `DECISIONS.md` |
   | Anything user-visible or schema-level | Add a line to `CHANGELOG.md` |
   | Discovered a bug or limitation you are not fixing now | `STATUS.md` → "Known issues" |
3. **STATUS.md is the handoff note.** End every work session by updating "Last updated", "Current state" and "Next up", so the next agent can continue cold.
4. **Never edit an applied migration.** Add a new one with `npm run db:new <name>`. Migrations are timestamped and immutable once pushed to production.
5. **Keep docs factual and current.** Delete statements that are no longer true instead of appending contradictions. Use dates in `YYYY-MM-DD` format.
6. **Where agent-specific instructions live:** `/CLAUDE.md` (and `/AGENTS.md`) at the repo root summarise these rules for coding agents. Keep them short and point here.
