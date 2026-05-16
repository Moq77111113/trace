<script lang="ts">
  import { initials } from '../lib/initials';
  import { plural }   from '$lib/shared/i18n/plural';
  import * as m       from '$lib/paraglide/messages';

  type Props = {
    name:         string;
    projectCount: number;
  };

  let { name, projectCount }: Props = $props();
</script>

<div class="m-2.5 mb-1.5 p-2.5 border border-border rounded-lg bg-surface flex items-center gap-2.5">
  <span class="w-[22px] h-[22px] rounded-md bg-surface-2 text-ink-2 text-[11px] font-semibold tracking-wider grid place-items-center shrink-0 border border-border">
    {initials(name).slice(0, 2) || 'P'}
  </span>
  <div class="flex-1 min-w-0">
    <div class="text-[13px] font-semibold leading-tight truncate">{name}</div>
    <div class="text-[11px] text-ink-3 mt-0.5 tabular-nums">
      {plural(projectCount, m.home_project_count_one, m.home_project_count_other)}
    </div>
  </div>
</div>
