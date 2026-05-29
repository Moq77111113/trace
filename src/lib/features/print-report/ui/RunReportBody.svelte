<script lang="ts">
  import ReportHeader  from './blocks/ReportHeader.svelte';
  import SummaryTile   from './blocks/SummaryTile.svelte';
  import ScenarioBlock from './blocks/ScenarioBlock.svelte';
  import { formatExecutionDuration } from '$lib/entities/execution/lib/format';
  import { extractScenarioSteps } from '$lib/shared/gherkin/steps';
  import type { ExecutionPageData } from '$lib/server/executions/read/queries';
  import type { RunScope } from '$lib/features/print-report/lib/scope';

  type Props = { data: NonNullable<ExecutionPageData>; scope: RunScope };
  let { data, scope }: Props = $props();

  const code     = $derived(`${data.project.codePrefix}-${data.feature.codeSeq}`);
  const featureContent = $derived(data.execution.featureContentAtStart);
  const adapted = $derived(
    data.scenarios.map((s) => ({
      id:           s.id,
      name:         s.scenarioName,
      status:       s.status,
      steps:        extractScenarioSteps(featureContent, s.scenarioName),
      errorMessage: s.errorMessage,
    })),
  );
  const visible  = $derived(scope === 'failed' ? adapted.filter((s) => s.status === 'FAILED') : adapted);
  const counts   = $derived({
    total:   adapted.length,
    passed:  adapted.filter((s) => s.status === 'PASSED').length,
    failed:  adapted.filter((s) => s.status === 'FAILED').length,
    skipped: adapted.filter((s) => s.status === 'SKIPPED').length,
  });
  const meta = $derived([
    ...(data.execution.environment ? [{ label: 'env', value: data.execution.environment }] : []),
    { label: 'started',  value: new Date(data.execution.startedAt).toLocaleString() },
    { label: 'duration', value: formatExecutionDuration(data.execution.startedAt, data.execution.finishedAt) },
    { label: 'executor', value: data.execution.executedBy },
    ...(data.execution.ciMetadata?.branch ? [{ label: 'branch', value: data.execution.ciMetadata.branch }] : []),
    ...(data.execution.ciMetadata?.commit ? [{ label: 'commit', value: data.execution.ciMetadata.commit }] : []),
  ]);
</script>

<ReportHeader title={data.feature.name} {code} status={data.execution.status} {meta} />
<SummaryTile label="Scenarios" total={counts.total} passed={counts.passed} failed={counts.failed} skipped={counts.skipped} />

{#each visible as scenario (scenario.id)}
  <ScenarioBlock {scenario} attachments={data.attachmentsByScenario[scenario.id] ?? []} />
{/each}
