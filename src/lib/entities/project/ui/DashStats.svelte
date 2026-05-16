<script lang="ts">
  import { formatDurationFromMs, passRatePercent } from '$lib/entities/project/lib/format';
  import * as m from '$lib/paraglide/messages';

  type ProjectDashboardStats = {
    passed7d:    number;
    finished7d:  number;
    runsToday:   number;
    medianMs7d:  number | null;
  };

  type Props = {
    stats:       ProjectDashboardStats;
    flakyCount:  number;
  };

  let { stats, flakyCount }: Props = $props();

  const tiles = $derived([
    { label: m.dash_tile_pass_rate(),  value: passRatePercent(stats.passed7d, stats.finished7d), hint: m.dash_tile_pass_rate_hint()  },
    { label: m.dash_tile_runs_today(), value: String(stats.runsToday),                           hint: m.dash_tile_runs_today_hint() },
    { label: m.dash_tile_flaky(),      value: String(flakyCount),                                hint: m.dash_tile_flaky_hint()      },
    { label: m.dash_tile_median(),     value: formatDurationFromMs(stats.medianMs7d),            hint: m.dash_tile_median_hint()     },
  ]);
</script>

<section
  class="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-3 mb-5"
  aria-label={m.dash_stats_label()}
>
  {#each tiles as t (t.label)}
    <div class="bg-surface border border-border rounded-xl px-3.5 py-3">
      <div class="text-[10.5px] uppercase tracking-[0.07em] text-ink-3 font-medium">{t.label}</div>
      <div class="text-[22px] font-semibold tabular-nums leading-none mt-2">{t.value}</div>
      <div class="text-[11.5px] text-ink-3 mt-1.5">{t.hint}</div>
    </div>
  {/each}
</section>
