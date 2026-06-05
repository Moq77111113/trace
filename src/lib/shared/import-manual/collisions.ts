import type { GroupingNode } from './grouping';

/** Existing corpus: lowercased feature name → set of lowercased scenario names already in it. */
export type ExistingCorpus = Map<string, Set<string>>;

/** Map each scenario ref to whether its name already exists in its resolved target feature. */
export function markCollisions(tree: GroupingNode[], existing: ExistingCorpus): Map<string, boolean> {
  const marked = new Map<string, boolean>();
  for (const node of tree) {
    const taken = existing.get(node.featureName.trim().toLowerCase());
    for (const scenario of node.scenarios) {
      marked.set(scenario.ref, taken?.has(scenario.name.trim().toLowerCase()) ?? false);
    }
  }
  return marked;
}
