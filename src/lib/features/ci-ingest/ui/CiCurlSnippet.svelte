<script lang="ts">
  import Button from '$lib/shared/ui/Button.svelte';
  import Input  from '$lib/shared/ui/Input.svelte';
  import Icon   from '$lib/shared/ui/Icon.svelte';

  type Props = {
    projectId:   string;
    projectSlug: string;
    baseUrl:     string;
  };

  let { projectId, projectSlug, baseUrl }: Props = $props();

  let env = $state('staging');

  const curl = $derived(`curl -X POST '${baseUrl}/api/executions/ingest' \\
  -H 'Authorization: Bearer <YOUR_KEY>' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Project-Id: ${projectId}' \\
  -H 'X-Environment: ${env}' \\
  -H 'X-CI-Feature-Code: <feature-code>' \\
  -H 'X-CI-Branch: <branch>' \\
  -H 'X-CI-Commit: <commit>' \\
  -H 'X-CI-Source: github-actions' \\
  --data-binary @cucumber.json`);

  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function copy() {
    await navigator.clipboard.writeText(curl);
    copied = true;
    clearTimeout(timer);
    timer = setTimeout(() => (copied = false), 1500);
  }
</script>

<label class="block text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-1.5 font-medium" for="env-input">
  Environment label
</label>
<div class="max-w-xs mb-4">
  <Input id="env-input" bind:value={env} />
</div>

<pre
  class="px-3 py-3 bg-canvas border border-border rounded-md text-[12px] font-mono whitespace-pre-wrap text-ink-2 select-all"
>{curl}</pre>

<div class="mt-3 flex items-center gap-3">
  <Button variant="secondary" onclick={copy}>
    <Icon name="Copy" size={13} /> Copy
  </Button>
  <span class="text-[12px] text-pass-ink tabular-nums" aria-live="polite">{copied ? 'Copied' : ''}</span>
  <a
    href="/p/{projectSlug}/settings/api-keys"
    class="ml-auto text-[12px] text-accent-soft-ink hover:underline"
  >
    Manage API keys →
  </a>
</div>
