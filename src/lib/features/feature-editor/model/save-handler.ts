import type { SubmitFunction } from '@sveltejs/kit';

type Feature = {
  id:          string;
  name:        string;
  content:     string;
  version:     number;
  parseErrors: { line: number; column?: number; message: string }[] | null;
  groupId:     string | null;
};

export type SaveSuccess = { feature: Feature };
export type SaveFailure = { error?: string; conflict?: boolean; currentFeature?: Feature };

export type SaveCallbacks = {
  onSaving:   () => void;
  onSaved:    (feature: Feature) => void;
  onConflict: (current: Feature) => void;
  onError:    (message: string) => void;
  onFinally:  () => void;
};

export function createSaveHandler(callbacks: SaveCallbacks): SubmitFunction<SaveSuccess, SaveFailure> {
  return () => {
    callbacks.onSaving();

    return async ({ result }) => {
      callbacks.onFinally();

      if (result.type === 'success' && result.data?.feature) {
        callbacks.onSaved(result.data.feature);
        return;
      }

      if (result.type === 'failure' && result.data?.conflict && result.data.currentFeature) {
        callbacks.onConflict(result.data.currentFeature);
        return;
      }

      if (result.type === 'failure' && result.data?.error) {
        callbacks.onError(result.data.error);
        return;
      }

      if (result.type === 'error') {
        callbacks.onError(result.error.message);
      }
    };
  };
}
