# trace

> Self-hostable BDD test management. Write Gherkin, run scenarios, witness what your tests actually did.

A small companion to Cucumber — editor, run viewer with scenario notes, CI ingest,
import/export, EN/FR. One Node process, one Postgres, no SaaS.

**Status:** MVP. Closed-by-default signup, first-admin claim, demo seed on install.

License: [MIT](./LICENSE).

---

## Quickstart

Self-host with one compose file — no clone needed:

```sh
curl -O https://moq77111113.github.io/trace.io/compose.yml
```

Create a `.env` next to it:

```sh
TRACE_AUTH_SECRET=$(openssl rand -hex 32)
TRACE_BOOTSTRAP_ADMIN_EMAIL=you@example.com   # first sign-up with this address becomes admin
```

```sh
docker compose up -d    # → http://localhost:7777
```

The app applies database migrations on boot. Once you've claimed the admin account,
open a signup window in instance settings to invite the rest of the team. The
[compose file](https://moq77111113.github.io/trace.io/compose.yml) documents every variable.

Hacking on trace itself? The dev-loop lives in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## CI ingest

```bash
curl -X POST 'https://your.trace/api/executions/ingest' \
  -H 'Authorization: Bearer $TRACE_KEY' \
  -H 'Content-Type: application/json' \
  -H 'X-Environment: staging' \
  --data-binary @cucumber.json
```

Project API keys are created from **Project · Settings · API keys**.

## Stack

SvelteKit · Postgres + Drizzle · Better Auth · Paraglide (i18n) · Tailwind 4 · Monaco.

## Contributing

Bugs and PRs welcome. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for branch rules,
the i18n workflow, and codebase conventions.

AI agents (Claude / Copilot / Cursor) — start with [`AGENTS.md`](./AGENTS.md).
