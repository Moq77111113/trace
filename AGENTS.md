# AGENTS

Conventions for AI agents (Claude, Copilot, Cursor, …) working in this repo.
Humans: see [`CONTRIBUTING.md`](./CONTRIBUTING.md) — most of the codebase rules live there.

This file covers the agent-specific bits: things humans pick up by osmosis but agents
need stated.

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
