<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import Icon   from '$lib/components/ui/Icon.svelte';

  type Props = { rawKey: string };
  let { rawKey }: Props = $props();

  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function copy() {
    await navigator.clipboard.writeText(rawKey);
    copied = true;
    clearTimeout(timer);
    timer = setTimeout(() => (copied = false), 1500);
  }
</script>

<div class="bg-accent-soft border border-accent/25 rounded-lg px-3.5 py-3 mb-3.5 flex items-center gap-3 text-[12.5px] max-md:flex-wrap">
  <Icon name="Key" size={14} class="text-accent-soft-ink shrink-0" />
  <strong class="text-accent-soft-ink whitespace-nowrap">Copy now — shown once.</strong>
  <code
    class="flex-1 text-[12px] text-accent-soft-ink px-2.5 py-1.5 bg-accent/5 border border-accent/20 rounded-md font-mono select-all break-all max-md:order-3 max-md:w-full"
  >{rawKey}</code>
  <Button variant="secondary" size="sm" onclick={copy}>
    <Icon name="Copy" size={12} /> {copied ? 'Copied' : 'Copy'}
  </Button>
</div>
