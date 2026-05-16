<script lang="ts">
  import Status from '$lib/shared/ui/Status.svelte';
  import { toStatusKind } from '$lib/shared/ui/Status.svelte';
  import { formatScenarioDuration } from '$lib/entities/execution/lib/format';

  type Scenario = {
    id:           string;
    scenarioName: string;
    status:       string;
    durationMs:   number | null;
  };

  type Props = {
    scenario: Scenario;
    active:   boolean;
    onSelect: (id: string) => void;
  };

  let { scenario, active, onSelect }: Props = $props();

  const kind = $derived(toStatusKind(scenario.status));
</script>

<li>
  <button
    type="button"
    class="grid grid-cols-[16px_1fr_auto] gap-2.5 px-3.5 py-2 w-full text-left bg-transparent border-0 cursor-pointer items-start border-l-2 border-transparent hover:bg-surface-2 {active ? 'bg-surface !border-l-accent' : ''}"
    data-s={kind}
    onclick={() => onSelect(scenario.id)}
  >
    <Status {kind} size={14} class="mt-0.5" />
    <div class="min-w-0">
      <div class="text-[13px] font-medium leading-tight {kind === 'skip' || kind === 'pending' ? 'text-ink-3 font-normal' : ''}">
        {scenario.scenarioName}
      </div>
    </div>
    <span class="text-[11px] text-ink-3 tabular-nums mt-0.5">
      {formatScenarioDuration(scenario.durationMs)}
    </span>
  </button>
</li>
