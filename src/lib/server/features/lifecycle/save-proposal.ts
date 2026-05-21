import type { features } from '$lib/server/db/schema';
import type { ParseResult, ParseError } from '$lib/shared/gherkin/types';

type Feature = typeof features.$inferSelect;

export type FeatureUpdates = {
  content:     string;
  description: string | null;
  name:        string;
  parseErrors: ParseError[] | null;
  version:     number;
  groupId:     string | null;
};

export type SaveProposal =
  | { kind: 'version-conflict';      currentFeature: Feature }
  | { kind: 'manual-name-collision'; collisions: string[] }
  | { kind: 'apply';                 updates: FeatureUpdates };

export type ProposeSaveInput = {
  current:         Feature;
  expectedVersion: number;
  content:         string;
  description:     string | null;
  groupId:         string | null | undefined;
  parsed:          ParseResult;
  liveManualNames: string[];
};

/**
 * Pure decision: given the current feature row and the would-be inputs, what should we do?
 * Either refuse (version-conflict / manual-name-collision) or apply with a precomputed
 * field set. The wrapper owns I/O; this owns the rules.
 *
 * `groupId === undefined` preserves the current value (form did not send it); explicit
 * `null` means "ungrouped".
 */
export function proposeFeatureSave(input: ProposeSaveInput): SaveProposal {
  const { current, expectedVersion, content, description, groupId, parsed, liveManualNames } = input;

  if (current.version !== expectedVersion) {
    return { kind: 'version-conflict', currentFeature: current };
  }

  const gherkinNames = parsed.scenarios.map((s) => s.name.trim().toLowerCase());
  if (gherkinNames.length > 0) {
    const collisions = liveManualNames.filter((n) => gherkinNames.includes(n.trim().toLowerCase()));
    if (collisions.length > 0) return { kind: 'manual-name-collision', collisions };
  }

  const trimmed = parsed.name?.trim();
  const newName = trimmed ? trimmed : current.name;

  return {
    kind: 'apply',
    updates: {
      content,
      description,
      name:        newName,
      parseErrors: parsed.errors.length > 0 ? parsed.errors : null,
      version:     current.version + 1,
      groupId:     groupId === undefined ? current.groupId : groupId,
    },
  };
}
