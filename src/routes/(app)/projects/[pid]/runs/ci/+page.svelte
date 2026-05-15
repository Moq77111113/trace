<script lang="ts">
  import { page } from '$app/state';
  import Button from '$lib/components/ui/Button.svelte';
  import Input  from '$lib/components/ui/Input.svelte';

  const projectId = $derived(page.params.pid ?? '');
  let env = $state('staging');

  const baseUrl = $derived(typeof window === 'undefined' ? 'https://your-trace-instance' : window.location.origin);

  const curlExample = $derived(`curl -X POST '${baseUrl}/api/runs/ingest' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Project-Id: ${projectId}' \\
  -H 'X-Environment: ${env}' \\
  -H 'X-CI-Source: github-actions' \\
  --data-binary @cucumber.json`);

  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  async function copy() {
    await navigator.clipboard.writeText(curlExample);
    copied = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied = false), 1500);
  }
</script>

<section class="max-w-3xl">
  <a href="/projects/{page.params.pid}/runs" class="inline-flex items-center gap-1 text-xs text-surface-400 hover:text-surface-200 mb-3">← Back to runs</a>
  <h2 class="text-base font-semibold mb-2">CI ingestion</h2>
  <p class="text-sm text-surface-300 mb-6">
    POST your <code class="text-surface-100">cucumber.json</code> from CI after each test job.
    One feature per call. The server matches by <code class="text-surface-100">Feature:</code> name (case-insensitive) within this project.
  </p>

  <label class="block text-xs uppercase tracking-wide text-surface-400 mb-1" for="env-input">Environment label</label>
  <Input id="env-input" bind:value={env} class="mb-4 max-w-xs" />

  <pre class="px-3 py-3 bg-surface-900 border border-surface-700 rounded text-xs font-mono whitespace-pre-wrap text-surface-200 select-all">{curlExample}</pre>

  <div class="mt-2 flex items-center gap-3">
    <Button variant="secondary" onclick={copy}>Copy</Button>
    <span class="text-xs text-state-passed" aria-live="polite">{copied ? 'Copied' : ''}</span>
  </div>

  <h3 class="text-xs uppercase tracking-wide text-surface-400 mt-10 mb-2">Supported emitters</h3>
  <ul class="text-sm space-y-1 text-surface-200 list-disc list-inside">
    <li><code>@cucumber/cucumber</code> (Node): <code>--format json:cucumber.json</code></li>
    <li>cucumber-jvm (Java/Maven): <code>--plugin json:target/cucumber.json</code></li>
    <li>godog (Go): <code>-f cucumber</code></li>
    <li>pytest-bdd (Python): <code>--cucumberjson</code></li>
    <li>SpecFlow (.NET): official cucumber JSON plugin</li>
  </ul>

  <h3 class="text-xs uppercase tracking-wide text-surface-400 mt-10 mb-2">Response shape</h3>
  <pre class="px-3 py-3 bg-surface-900 border border-surface-700 rounded text-xs font-mono whitespace-pre-wrap text-surface-200">{`{
  "run_id":            "<uuid>",
  "status":            "PASSED" | "FAILED" | "SKIPPED",
  "scenarios_matched": <int>,
  "scenarios_unknown": <int>,
  "warnings":          ["..."]
}`}</pre>

  <h3 class="text-xs uppercase tracking-wide text-surface-400 mt-10 mb-2">Error codes</h3>
  <ul class="text-sm space-y-1 text-surface-200">
    <li><code>400</code> — missing project header, invalid JSON, or unparseable cucumber payload</li>
    <li><code>404</code> — no feature in the project matches the <code>Feature:</code> name</li>
    <li><code>500</code> — DB/storage failure</li>
  </ul>
</section>
