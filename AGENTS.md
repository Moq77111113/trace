# AGENTS

Conventions for AI agents (Claude, Copilot, Cursor, …) working in this repo.
Humans: see [`CONTRIBUTING.md`](./CONTRIBUTING.md) — most of the codebase rules live there.

This file covers the agent-specific bits: things humans pick up by osmosis but agents
need stated.

---

## Product vision (read before designing features)

Trace is a **simple, fast tool** for:

- writing Gherkin scenarios
- organising features
- exporting `.feature` files
- recording test runs
- consulting execution history

That is the whole product. Trace is **not** a Zephyr/Xray replacement, a Jira clone,
an enterprise QA platform, a CI/CD orchestrator, a workflow engine, an analytics
suite, a real-time collaboration platform, or an "AI-augmented" anything.

The optimised path is:

```
write a scenario  →  export  →  run  →  see the result
```

A feature that does not directly serve this path probably does not belong in the product.

### Five questions before any new feature

Run every proposal through these. A "no" on any one is a strong signal the feature
does not belong:

1. Is it used **frequently**?
2. Is it **critical** for the daily workflow?
3. Does it actually **simplify** the work?
4. Can it be **explained in one sentence**?
5. Is the **maintenance cost** justified?

Surface this filter explicitly in brainstorming when you propose anything new.

### Defaults

- Prefer **fewer features, well used** over more features.
- Prefer **plain text** (the `.feature` file is the source of truth) over visual
  builders, drag-and-drop, or magic layers.
- Prefer **simple, robust** over future-proof or hyperscale. No premature event
  sourcing, no microservices, no abstractions for tomorrow's hypothetical needs.
- Reject "just a small feature." Every addition is permanent maintenance cost,
  UX debt, and complexity. There is no such thing as a free feature.

### The trap

The danger is not lacking features. The danger is **recreating an enterprise tool
by accident** — a thousand "small features" that turn a sober tool into a maze.

> Do less. But do it extremely well.

---

## Hard rules

- **Match the commit pattern** `{type}({scope}): {short}`. No AI signatures, no `--amend`
  unless the user asks, no `git add -f`, no skipping hooks (`--no-verify`).
- **Don't commit documentation** (README, AGENTS, CONTRIBUTING, LICENSE, design notes)
  unless the user explicitly asks. Flag the diff and let them commit.
- **All user-facing strings go through Paraglide** — see CONTRIBUTING.md for the recipe.
  Adding a literal string in a component or `+page.server.ts` is a bug.
- **No `svelte-ignore` comments** to silence warnings — use `untrack(() => ...)`.
- **No new `any`**, no new `eslint-disable`.

---

## Framework design (lead-dev rule)

This is a framework codebase: surfaces other devs extend or call — components, server
kernels, CLI flags, codegen, archetypes. Filter every new surface through this:

- Can a mid-level dev use this correctly **without thinking**? If no, reject the shape.
- Every easy misuse is a design bug. Kill it by the shape of the tool, not by
  docs / review / convention.
- The right path must be copy-pasteable. No naming decisions, no pattern choice,
  no DDD understanding required.

Ergonomics wins at developer-facing surfaces (HTTP, SDK, CLI, components, test DSL).
Purity stays in internal layers (domain, event log, CI internals).

When proposing a new surface in brainstorming, *surface this filter explicitly*:
identify the natural misuse, kill it by the shape, simplify the right path to absurdity.

---

## Svelte MCP

When writing Svelte / SvelteKit code, use the official Svelte MCP server:

1. `list-sections` first — discover the doc sections relevant to the task.
2. `get-documentation` — fetch the ones you need.
3. `svelte-autofixer` — run on any component you write; keep calling until it's silent.
4. `playground-link` — only if the user asks, and never for code already written to
   a project file.

---

## Pacing

For mechanical features (wiring up a clear spec, adding a CRUD route, renaming a
surface), skip the brainstorming-skill / 1000-line-plan ritual. Tight loops, small
commits, run `pnpm check` between scopes.

For ambiguous work (new abstractions, public-API design, architectural choices),
brainstorm with the user first — alignment before code.

---

## Layering — Feature-Sliced Design (FSD)

`src/lib` is organised in four layers. Each layer may only depend on layers below it:

```
widgets/   →  features/   →  entities/   →  shared/
```

SvelteKit owns the top two FSD layers (`app`, `pages`) via `src/routes`. A route
file may import from any `$lib` layer — it's the composition root.

### What goes where

| Layer        | What it holds                                                                   | Examples                                                       |
| ------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `shared/`    | Framework-agnostic primitives, brand assets, infra helpers. No domain meaning.  | `ui/Button`, `brand/BrandMark`, `gherkin/parse`, `i18n/plural` |
| `entities/`  | Domain nouns: how an `execution` / `feature` / `project` is shown and read.     | `entities/execution/ui/ExecutionsTable`, `lib/format`          |
| `features/`  | A single user-meaningful action or interactive flow. Verbs.                     | `features/csv-export`, `features/live-execution`               |
| `widgets/`   | Page-level composed chrome with no single user action. Orchestrates the rest.   | `widgets/sidebar`, `widgets/topbar`, `widgets/command-palette` |

### Slice anatomy

A slice (e.g. `features/live-execution/`) is split into segments:

| Segment   | Holds                                                                  |
| --------- | ---------------------------------------------------------------------- |
| `ui/`     | Svelte components. The visual surface.                                 |
| `model/`  | `.svelte.ts` factories / controllers with `$state`. The stateful core. |
| `api/`    | HTTP / server calls. No UI imports.                                    |
| `lib/`    | Pure functions: format, parse, helpers tied to the slice.              |

Not every slice needs every segment. A small read-only slice may only have `ui/`.

```
features/live-execution/
  ui/
    LiveExecution.svelte
    ScenarioPanel.svelte
    FinishConfirmModal.svelte
  model/
    controller.svelte.ts        // $state factory / class
  api/
    mark.ts
```

### Hard rules

- **Imports go one direction only**: a `widgets/` file may import from `features/`,
  `entities/`, `shared/`. A `features/` file may NOT import from `widgets/`. An
  `entities/` file may NOT import from `features/` or `widgets/`. A `shared/` file
  may NOT import from any of the above.
- **No new code in `src/lib/components/`**. The flat dump is gone — pick a layer.
- **No large page.svelte**. If a `+page.svelte` grows past ~60 lines of body
  template, the next composed chunk becomes a slice in `features/` or `widgets/`.
  Keep `+page.svelte` to data-fetching glue and a small composition tree.
- **No monolithic feature components**. If a component approaches ~200 LoC,
  split it: sub-components in the same `ui/` folder, state lifted into `model/`.
  A Svelte 5 `$state` class in `model/<slice>.svelte.ts` is the house store —
  see `features/live-execution/model/controller.svelte.ts` for the pattern.
- **Pure transforms** in `lib/` (or `entities/<x>/lib/format.ts`), never inline
  in components. Stateful behaviour in `model/` factories.
