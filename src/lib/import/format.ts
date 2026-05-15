import type { PreviewRowStatus } from '$lib/server/import/types';

export type Decision = 'import' | 'skip' | 'overwrite' | 'rename';

export const DECISIONS: readonly Decision[] = ['import', 'skip', 'overwrite', 'rename'] as const;

export function defaultActionFor(status: PreviewRowStatus): Decision {
  if (status === 'new')         return 'import';
  if (status === 'collision')   return 'skip';
  return 'skip';
}

const DECISION_LABELS: Record<Decision, string> = {
  import:    'Import',
  skip:      'Skip',
  overwrite: 'Overwrite',
  rename:    'Rename',
};

export function decisionOptionsFor(status: PreviewRowStatus): { value: Decision; label: string }[] {
  if (status === 'new') {
    return [
      { value: 'import', label: DECISION_LABELS.import },
      { value: 'skip',   label: DECISION_LABELS.skip   },
    ];
  }
  if (status === 'collision') {
    return [
      { value: 'skip',      label: DECISION_LABELS.skip      },
      { value: 'overwrite', label: DECISION_LABELS.overwrite },
      { value: 'rename',    label: DECISION_LABELS.rename    },
    ];
  }
  return [
    { value: 'import', label: 'Import (non-runnable)' },
    { value: 'skip',   label: DECISION_LABELS.skip    },
  ];
}

const STATUS_SYMBOLS: Record<PreviewRowStatus, string> = {
  'new':          '✓',
  'collision':    '⚠',
  'parse-error':  '✗',
};

export function statusSymbol(status: PreviewRowStatus): string {
  return STATUS_SYMBOLS[status];
}

const STATUS_ROW_BG: Record<PreviewRowStatus, string> = {
  'new':          '',
  'collision':    'bg-state-running/5',
  'parse-error':  'bg-state-failed/5',
};

export function statusRowClass(status: PreviewRowStatus): string {
  return STATUS_ROW_BG[status];
}

const STATUS_TEXT: Record<PreviewRowStatus, string> = {
  'new':          'text-state-passed',
  'collision':    'text-state-running',
  'parse-error':  'text-state-failed',
};

export function statusTextClass(status: PreviewRowStatus): string {
  return STATUS_TEXT[status];
}

export function slug(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export function featureFilename(name: string): string {
  const base = slug(name) || 'feature';
  return `${base}.feature`;
}

export function projectArchiveFilename(name: string): string {
  const base = slug(name) || 'project';
  return `${base}.zip`;
}
