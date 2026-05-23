import type { Action, Effect, PolicyAction, ScopeKind, SubjectKind } from './actions';

/** A request's identity: a specific user and (implicitly) the built-in any-user subject. */
export type SubjectRef =
  | { kind: 'user'; id: string }
  | { kind: 'any-user' };

/** One link in a resource's ancestry, from the resource itself up to the instance root. */
export type ScopeRef =
  | { kind: 'instance' }
  | { kind: 'project' | 'feature' | 'execution'; id: string };

/** A persisted policy, shaped for evaluation (mirrors the `policies` table). */
export type PolicyRow = {
  subjectKind: SubjectKind;
  subjectId:   string | null;
  action:      PolicyAction;
  scopeKind:   ScopeKind;
  scopeId:     string | null;
  effect:      Effect;
};

const subjectKey       = (s: SubjectRef): string => (s.kind === 'any-user' ? 'any-user' : `user:${s.id}`);
const policySubjectKey = (p: PolicyRow): string  => (p.subjectKind === 'any-user' ? 'any-user' : `user:${p.subjectId}`);
const scopeKey         = (s: ScopeRef): string   => (s.kind === 'instance' ? 'instance' : `${s.kind}:${s.id}`);
const policyScopeKey   = (p: PolicyRow): string  => (p.scopeKind === 'instance' ? 'instance' : `${p.scopeKind}:${p.scopeId}`);

/** A single access question: may `subjects` perform `action` on `scopeChain`, given `policies`. */
export type AccessRequest = {
  subjects:   SubjectRef[];
  action:     Action;
  scopeChain: ScopeRef[];
  policies:   PolicyRow[];
};

/**
 * Decides whether `action` is allowed on the resource described by `scopeChain`,
 * given the request's `subjects` and the candidate `policies`.
 *
 * Rules: a policy applies when its subject is in `subjects`, its action equals
 * `action` or the wildcard, and its scope is anywhere in `scopeChain` (cascade).
 * Among applicable policies, any `deny` wins; otherwise an `allow` grants; with
 * no applicable policy the answer is deny (default-deny).
 */
export function can({ subjects, action, scopeChain, policies }: AccessRequest): boolean {
  const subjectKeys = new Set(subjects.map(subjectKey));
  const scopeKeys   = new Set(scopeChain.map(scopeKey));

  let allowed = false;
  for (const p of policies) {
    if (!subjectKeys.has(policySubjectKey(p))) continue;
    if (p.action !== action && p.action !== '*') continue;
    if (!scopeKeys.has(policyScopeKey(p))) continue;

    if (p.effect === 'deny') return false;
    allowed = true;
  }
  return allowed;
}
