import { invalidateAll } from '$app/navigation';
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
    private readonly form:           FeatureForm,
    private readonly readFeature:    () => Feature,
    private readonly onSavedCallback?: (f: Feature) => void,
  ) {
    this.onSubmit = createSaveHandler({
      onSaving:   () => { this.saving = true; this.saveError = null; },
      onFinally:  () => { this.saving = false; },
      onSaved:    (f) => {
        this.form.reset(f);
        this.onSavedCallback?.(f);
      },
      onConflict: (current) => { this.conflictWith = current; this.conflictOpen = true; },
      onError:    (msg)     => { this.saveError = msg; },
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
