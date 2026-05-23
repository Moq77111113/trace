import type { Action } from './actions';

/** The human roles offered on the project Access page, ordered by increasing authority. */
export const PROJECT_ROLES = ['viewer', 'editor', 'manager'] as const;

/** A role a subject can hold on a project. */
export type ProjectRole = (typeof PROJECT_ROLES)[number];

const VIEWER:  Action[] = ['project.access', 'feature.view', 'execution.review'];
const EDITOR:  Action[] = [...VIEWER, 'feature.author', 'execution.run'];
const MANAGER: Action[] = [...EDITOR, 'project.manage'];

const ROLE_VERBS: Record<ProjectRole, Action[]> = { viewer: VIEWER, editor: EDITOR, manager: MANAGER };

/**
 * Every verb meaningful at project scope (the manager set). The Access page's
 * effective view iterates these, not all `ACTIONS`: a project-scoped `*` wildcard
 * would otherwise match the instance-only `instance.administer` verb on the
 * `[project, instance]` chain and surface a nonsensical capability.
 */
export const PROJECT_VERBS: readonly Action[] = MANAGER;

/** The exact set of verbs a role grants at project scope. */
export function verbsForRole(role: ProjectRole): Action[] {
  return [...ROLE_VERBS[role]];
}

/**
 * The role whose verb set exactly equals `verbs`, or `null` when none matches.
 * A `null` result is rendered as the read-only "Custom" bucket (e.g. a creator's
 * `*` wildcard or a partial seeded set). Accepts `ReadonlySet<string>` so policy
 * rows holding the `*` wildcard can be passed without a cast.
 */
export function roleForVerbs(verbs: ReadonlySet<string>): ProjectRole | null {
  for (const role of PROJECT_ROLES) {
    const rv = ROLE_VERBS[role];
    if (rv.length === verbs.size && rv.every((v) => verbs.has(v))) return role;
  }
  return null;
}
