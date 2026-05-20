<script lang="ts">
  import Pill   from '$lib/shared/ui/Pill.svelte';
  import * as m from '$lib/paraglide/messages';

  type Props = { configured: boolean; testedAt?: Date | string | null };
  let { configured, testedAt = null }: Props = $props();

  const label = $derived(
    configured ? m.instance_smtp_status_configured() : m.instance_smtp_status_unconfigured(),
  );
  const tested = $derived(
    configured && testedAt
      ? m.instance_smtp_last_tested({ when: new Date(testedAt).toLocaleString() })
      : '',
  );
</script>

<div class="flex items-center gap-2">
  <Pill kind={configured ? 'brand' : 'neutral'}>{label}</Pill>
  {#if tested}
    <span class="text-[11px] text-ink-3">{tested}</span>
  {/if}
</div>
