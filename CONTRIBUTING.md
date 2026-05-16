# Contributing to trace

Thanks for considering a contribution. trace is a small project — keep PRs focused
and the maintainer will keep them moving.

## Setup

```sh
docker compose up -d db
pnpm install
pnpm db:push
pnpm dev
```

Requires **Node 24+**

## Before opening a PR

```sh
pnpm check    # typecheck + Svelte diagnostics — must be 0 errors / 0 warnings
pnpm test     # Vitest + Testcontainers (spins up a real Postgres)
pnpm build    # production build smoke test
```

## Branches & commits

- Branch off `main` with `{type}/{slug}` — e.g. `fix/mobile-sidebar`, `feat/ci-ingest`.
- Commit pattern: `{type}({scope}): {short description}`. One concern per commit.
- Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
- Prefer several short commits over one big one. We squash-merge if a PR has dev-noise.

## Adding an i18n string

Every user-facing string — in components **and** server endpoints — goes through Paraglide.

1. Add the key to **both** `messages/en.json` and `messages/fr.json` — same key, same placeholders.
2. Call it:

   ```ts
   import * as m from '$lib/paraglide/messages';
   m.your_key();                    // simple
   m.your_key({ name: 'Quentin' }); // with placeholders
   ```

3. **No `#` plural placeholder** — the message-format plugin doesn't support it.
   Use two keys + the helper:

   ```json
   "foo_count_one":   "{count} item",
   "foo_count_other": "{count} items"
   ```
   ```ts
   import { plural } from '$lib/i18n/plural';
   plural(count, m.foo_count_one, m.foo_count_other);
   ```

Key naming is flat `snake_case`, namespaced by surface:

| Prefix          | What                                         |
| --------------- | -------------------------------------------- |
| `nav_*`         | Sidebar / topbar / breadcrumb                |
| `page_title_*`  | Browser tab title — used by `<PageTitle />`  |
| `<page>_*`      | Strings local to one page                    |
| `error_*`       | User-facing errors (UI **and** API)          |
| `time_*`        | Relative-time strings                        |

Page titles use the helper:

```svelte
<PageTitle title={m.page_title_runs()} />
<!-- or, with dynamic context: -->
<PageTitle title={`${m.page_title_export()} · ${data.project.name}`} />
```

The Paraglide compiler runs via the Vite plugin on `pnpm dev` / `pnpm build`. If you
edit the JSON outside a running dev session and need types refreshed:

```sh
pnpm exec paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide
```

## Codebase conventions

These keep the codebase coherent — apply them to new code and call them out in review.

- **No `svelte-ignore` comments to silence warnings.** Use `untrack(() => ...)` for the
  legitimate "capture initial prop value only" case (see `Topbar.svelte`,
  `account/+page.svelte`, `login/+page.svelte`).
- **Status colors come from the design system.** Use `Pill.svelte` / `Status.svelte`
  and the tokens in `src/app.css`. Don't hard-code hex or status labels.
- **No inline helpers in components.** Pure transforms go in `<domain>/format.ts`.
  Stateful behaviour goes in factories or controllers (`createRunApi`, `LiveRunController`).
- **No getter/setter without intention.** Expose `$state` fields directly; methods only
  for verbs that mean something (`markPassed`, `flushNotes`).
- **No comments** unless the WHY is non-obvious. Identifiers are the labels — well-named
  code doesn't need narration.
- **No toasts** for user-initiated actions — use status pills, dirty indicators, or
  inline errors. Toasts are reserved for unsolicited async events.
- **No spinners as loading UX.** Pre-render the content-shaped placeholder.

## Tests

`pnpm test` boots a real Postgres via Testcontainers (`tests/global-setup.ts`).
Integration tests hit the real DB — please don't introduce DB mocks.

## License

By contributing you agree your contributions will be licensed under the
[MIT License](./LICENSE).
