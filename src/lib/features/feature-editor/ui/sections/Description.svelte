<script lang="ts">
  import { untrack } from 'svelte';
  import CollapsibleSection from '$lib/shared/ui/CollapsibleSection.svelte';
  import { persistedToggle } from '$lib/shared/storage/persisted-toggle.svelte';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    featureId: string;
    value:     string;
    onChange:  (next: string) => void;
    readonly?: boolean;
  };

  let { featureId, value, onChange, readonly = false }: Props = $props();

  const open = untrack(() =>
    persistedToggle(`feature-editor-description:${featureId}`, value.length > 0, 'session'),
  );
</script>

<CollapsibleSection
  title={m.feature_editor_description_title()}
  subtitle={m.feature_editor_description_subtitle()}
  bind:open={open.value}
  empty={value.length === 0 && !open.value}
  addLabel={m.feature_editor_description_add()}
  onAdd={() => {
    if (readonly) return;
    open.value = true;
    onChange('');
  }}
>
  <textarea
    class="min-h-32 w-full rounded-md border border-border bg-surface p-3 text-sm leading-relaxed"
    placeholder={m.feature_editor_description_placeholder()}
    {readonly}
    {value}
    oninput={(e) => onChange((e.currentTarget as HTMLTextAreaElement).value)}
  ></textarea>
</CollapsibleSection>
