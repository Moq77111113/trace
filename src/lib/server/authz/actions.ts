/** The closed set of authorization verbs. Single source of truth; `policies.action` is validated against this. */
export const ACTIONS = [
  'project.access',
  'project.manage',
  'feature.view',
  'feature.author',
  'execution.run',
  'execution.review',
  'campaign.manage',
  'instance.administer',
] as const;

/** A concrete authorization verb. */
export type Action = (typeof ACTIONS)[number];

/** The wildcard stored on superuser policy rows; matches any action at evaluation time. */
export const ACTION_WILDCARD = '*';

/** A value persisted in `policies.action`: a concrete verb or the wildcard. */
export type PolicyAction = Action | typeof ACTION_WILDCARD;

export type SubjectKind = 'user' | 'any-user';
export type ScopeKind   = 'instance' | 'project' | 'feature' | 'execution';
export type Effect      = 'allow' | 'deny';

/** Narrows an arbitrary string to a known concrete `Action` (the wildcard is not an Action). */
export function isAction(value: string): value is Action {
  return (ACTIONS as readonly string[]).includes(value);
}
