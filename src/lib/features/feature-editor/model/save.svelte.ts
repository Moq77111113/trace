import { invalidateAll } from '$app/navigation';
import * as m from '$lib/paraglide/messages';
import { createSaveHandler } from './save-handler';
import type { FeatureForm } from './feature-form.svelte';
import type { Feature } from './types';

export class SaveFlow {
  saving:       boolean         = $state(false);
  saveError:    string | null   = $state(null);
  conflictOpen: boolean         = $state(false);
  conflictWith: Feature | null  = $state(null);

  readonly onSubmit;

  constructor(
    private readonly form:            FeatureForm,
    private readonly readFeature:     () => Feature,
    private readonly onSavedCallback?: (f: Feature) => void,
  ) {
    this.onSubmit = createSaveHandler({
      onSaving:  () => { this.saving = true; this.saveError = null; },
      onFinally: () => { this.saving = false; },
      onOutcome: (outcome) => {
        switch (outcome.kind) {
          case 'saved':
            this.form.reset(outcome.feature);
            this.onSavedCallback?.(outcome.feature);
            void invalidateAll();
            return;
          case 'conflict':
            this.conflictWith = outcome.currentFeature;
            this.conflictOpen = true;
            return;
          case 'collision':
            this.saveError = m.feature_save_manual_name_collision({ name: outcome.names.join(', ') });
            return;
          case 'error':
            this.saveError = outcome.message;
            return;
        }
      },
    });
  }

  reload = (): void => {
    this.conflictOpen = false;
    this.conflictWith = null;
    void invalidateAll().then(() => {
      this.form.reset(this.readFeature());
    });
  };

  dismissConflict = (): void => {
    this.conflictOpen = false;
    this.conflictWith = null;
  };
}
