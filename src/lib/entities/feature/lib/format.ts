import type { PillKind } from '$lib/components/ui/Pill.svelte';

type FeatureLike = {
  parseErrors?:         { line: number; column?: number; message: string }[] | null;
  latestFinishedStatus: string | null;
};

export type FeatureStatusPill = { kind: PillKind; label: string };

export function featureStatusPill(f: FeatureLike): FeatureStatusPill {
  const errs = f.parseErrors?.length ?? 0;
  if (errs > 0) {
    return { kind: 'fail', label: `${errs} parse error${errs === 1 ? '' : 's'}` };
  }
  if (f.latestFinishedStatus === 'PASSED')  return { kind: 'pass',    label: 'pass'   };
  if (f.latestFinishedStatus === 'FAILED')  return { kind: 'fail',    label: 'fail'   };
  if (f.latestFinishedStatus === 'SKIPPED') return { kind: 'skip',    label: 'skip'   };
  return { kind: 'pending', label: 'no run' };
}
