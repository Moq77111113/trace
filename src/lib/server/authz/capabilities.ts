import type { Action } from './actions';
import type { Authorizer } from './authorizer';
import type { ScopeRef } from './evaluate';
import { PROJECT_VERBS } from './roles';

/** The project-scoped verbs the user is granted — the UI's gating input for a project subtree. */
export async function projectCapabilities(authz: Authorizer, projectId: string): Promise<Action[]> {
  const chain: ScopeRef[] = [{ kind: 'project', id: projectId }, { kind: 'instance' }];
  const checks = await Promise.all(PROJECT_VERBS.map((verb) => authz.can(verb, chain)));
  return PROJECT_VERBS.filter((_, i) => checks[i]);
}
