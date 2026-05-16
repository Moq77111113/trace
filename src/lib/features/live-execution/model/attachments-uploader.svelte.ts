import type { ExecutionApi, UploadedAttachment } from '../api/client';
import type { ScenarioSelection } from './selection.svelte';

export class AttachmentsUploader {
  uploadsByScenario: Record<string, UploadedAttachment[]> = $state({});
  uploading:         boolean                              = $state(false);
  uploadError:       string | null                        = $state(null);

  constructor(private readonly selection: ScenarioSelection, private readonly api: ExecutionApi) {}

  upload = async (files: File[]): Promise<void> => {
    const target = this.selection.selected;
    if (!target) return;

    this.uploading   = true;
    this.uploadError = null;

    try {
      for (const file of files) {
        try {
          const row      = await this.api.uploadScenarioAttachment(target.id, file);
          const existing = this.uploadsByScenario[target.id] ?? [];
          this.uploadsByScenario = { ...this.uploadsByScenario, [target.id]: [...existing, row] };
        } catch (e) {
          this.uploadError = e instanceof Error ? e.message : `Upload failed for ${file.name}`;
        }
      }
    } finally {
      this.uploading = false;
    }
  };
}
