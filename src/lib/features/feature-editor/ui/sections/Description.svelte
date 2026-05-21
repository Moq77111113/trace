<script lang="ts">
  import { untrack } from 'svelte';
  import CollapsibleSection from '$lib/shared/ui/CollapsibleSection.svelte';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    featureId: string;
    value:     string;
    onChange:  (next: string) => void;
  };

  let { featureId, value, onChange }: Props = $props();

  let open = $state(untrack(() => value.length > 0));
</script>

<CollapsibleSection
  title={m.feature_editor_description_title()}
  subtitle={m.feature_editor_description_subtitle()}
  storageKey={`feature-editor-description:${featureId}`}
  {open}
  empty={value.length === 0 && !open}
  addLabel={m.feature_editor_description_add()}
  onOpenChange={(v) => (open = v)}
  onAdd={() => {
    open = true;
    onChange('');
  }}
>
  <textarea
    class="min-h-32 w-full rounded-md border border-border bg-surface p-3 text-sm leading-relaxed"
    placeholder={m.feature_editor_description_placeholder()}
    {value}
    oninput={(e) => onChange((e.currentTarget as HTMLTextAreaElement).value)}
  ></textarea>
</CollapsibleSection>
