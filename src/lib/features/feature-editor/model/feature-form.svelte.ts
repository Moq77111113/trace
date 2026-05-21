type FeatureLike = {
  content:     string;
  description: string | null;
  groupId:     string | null;
  version:     number;
};

type FormFields = {
  content:     string;
  description: string;
  groupId:     string;
};

function snapshot(f: FeatureLike): FormFields {
  return {
    content:     f.content,
    description: f.description ?? '',
    groupId:     f.groupId ?? '',
  };
}

export class FeatureForm {
  fields:  FormFields = $state({ content: '', description: '', groupId: '' });
  initial: FormFields = $state({ content: '', description: '', groupId: '' });
  version: number     = $state(0);

  constructor(feature: FeatureLike) {
    const seed = snapshot(feature);
    Object.assign(this.fields,  seed);
    Object.assign(this.initial, seed);
    this.version = feature.version;
  }

  get dirty(): boolean {
    return (
      this.fields.content     !== this.initial.content     ||
      this.fields.description !== this.initial.description ||
      this.fields.groupId     !== this.initial.groupId
    );
  }

  reset(f: FeatureLike): void {
    const seed = snapshot(f);
    Object.assign(this.fields,  seed);
    Object.assign(this.initial, seed);
    this.version = f.version;
  }
}
