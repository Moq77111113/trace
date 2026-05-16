# trace

> Self-hostable BDD test management. Write Gherkin, run scenarios, witness what your tests actually did.

A small companion to Cucumber — editor, run viewer with scenario notes, CI ingest,
import/export, EN/FR. One Node process, one Postgres, no SaaS.

**Status:** MVP. Closed-by-default signup, first-admin claim, demo seed on install.

License: [MIT](./LICENSE).

---

## Quickstart

```sh
docker compose up -d db
pnpm install && pnpm db:push
pnpm dev
```

Set `TRACE_BOOTSTRAP_ADMIN_EMAIL` in `.env` — the first sign-up with that address
becomes admin. From there, open a signup window in instance settings to invite the
rest of the team. See [`.env.example`](./.env.example) for the full list of variables.

## CI ingest

```sh
curl -X POST https://your.trace/api/runs/ingest \
  -H 'X-Project-Id: <pid>' \
  -H 'X-Environment: ci' \
  -H 'X-CI-Source: github-actions' \
  --data-binary @cucumber.json
```

Project API keys are created from **Project · Settings · API keys**.

## Stack

SvelteKit · Postgres + Drizzle · Better Auth · Paraglide (i18n) · Tailwind 4 · Monaco.

## Contributing

Bugs and PRs welcome. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for branch rules,
the i18n workflow, and codebase conventions.

AI agents (Claude / Copilot / Cursor) — start with [`AGENTS.md`](./AGENTS.md).
