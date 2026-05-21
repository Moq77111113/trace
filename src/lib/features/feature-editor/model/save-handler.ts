import * as m from '$lib/paraglide/messages';
import type { SubmitFunction } from '@sveltejs/kit';
import type { Feature } from './types';

export type SaveSuccess = { feature: Feature };
export type SaveFailure = { error?: string; conflict?: boolean; currentFeature?: Feature; nameCollisions?: string[] };

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

      if (result.type === 'failure' && result.data?.nameCollisions && result.data.nameCollisions.length > 0) {
        const names = result.data.nameCollisions.join(', ');
        callbacks.onError(m.feature_save_manual_name_collision({ name: names }));
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
