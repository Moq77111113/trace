import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import type { Feature } from './types';

export type SaveSuccess = { feature: Feature };
export type SaveFailure = {
  error?:          string;
  conflict?:       boolean;
  currentFeature?: Feature;
  nameCollisions?: string[];
};

/**
 * Outcome of a save submission, normalised so the caller can dispatch via a
 * single exhaustive switch instead of repeating `result.type === ...` checks.
 */
export type SaveOutcome =
  | { kind: 'saved';     feature:        Feature }
  | { kind: 'conflict';  currentFeature: Feature }
  | { kind: 'collision'; names:          string[] }
  | { kind: 'error';     message:        string };

export function interpretSaveResult(result: ActionResult<SaveSuccess, SaveFailure>): SaveOutcome {
  if (result.type === 'success' && result.data?.feature) {
    return { kind: 'saved', feature: result.data.feature };
  }
  if (result.type === 'failure' && result.data?.conflict && result.data.currentFeature) {
    return { kind: 'conflict', currentFeature: result.data.currentFeature };
  }
  if (result.type === 'failure' && result.data?.nameCollisions && result.data.nameCollisions.length > 0) {
    return { kind: 'collision', names: result.data.nameCollisions };
  }
  if (result.type === 'failure' && result.data?.error) {
    return { kind: 'error', message: result.data.error };
  }
  if (result.type === 'error') {
    return { kind: 'error', message: result.error.message };
  }
  return { kind: 'error', message: 'unknown save outcome' };
}

export type SaveHandlerOptions = {
  onSaving:  () => void;
  onFinally: () => void;
  onOutcome: (outcome: SaveOutcome) => void;
};

export function createSaveHandler(opts: SaveHandlerOptions): SubmitFunction<SaveSuccess, SaveFailure> {
  return () => {
    opts.onSaving();
    return async ({ result }) => {
      opts.onFinally();
      opts.onOutcome(interpretSaveResult(result));
    };
  };
}
