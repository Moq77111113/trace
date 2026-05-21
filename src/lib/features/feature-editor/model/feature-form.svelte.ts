type FeatureLike = { content: string; groupId: string | null; version: number };

type FormFields = { content: string; groupId: string };

function snapshot(f: FeatureLike): FormFields {
  return { content: f.content, groupId: f.groupId ?? '' };
}

export class FeatureForm {
  fields:  FormFields = $state({ content: '', groupId: '' });
  initial: FormFields = $state({ content: '', groupId: '' });
  version: number     = $state(0);

  constructor(feature: FeatureLike) {
    const seed = snapshot(feature);
    Object.assign(this.fields,  seed);
    Object.assign(this.initial, seed);
    this.version = feature.version;
  }

  get dirty(): boolean {
    return (
      this.fields.content !== this.initial.content ||
      this.fields.groupId !== this.initial.groupId
    );
  }

  reset(f: FeatureLike): void {
    const seed = snapshot(f);
    Object.assign(this.fields,  seed);
    Object.assign(this.initial, seed);
    this.version = f.version;
  }
}
