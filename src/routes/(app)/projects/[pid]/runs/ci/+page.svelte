<script lang="ts">
  import { page } from '$app/state';
  import Button from '$lib/components/ui/Button.svelte';
  import Input  from '$lib/components/ui/Input.svelte';
  import Icon   from '$lib/components/ui/Icon.svelte';

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

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  <section class="max-w-3xl">
    <a
      href="/projects/{page.params.pid}/runs"
      class="inline-flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink mb-3"
    >
      ← Back to runs
    </a>

    <h1 class="text-[20px] font-semibold tracking-tight mb-1">CI ingestion</h1>
    <p class="text-[13px] text-ink-3 max-w-[56ch] mb-6">
      POST your <code class="font-mono text-ink-2">cucumber.json</code> from CI after each test job.
      One feature per call. The server matches by <code class="font-mono text-ink-2">Feature:</code>
      name (case-insensitive) within this project.
    </p>

    <label class="block text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-1.5 font-medium" for="env-input">
      Environment label
    </label>
    <div class="max-w-xs mb-4">
      <Input id="env-input" bind:value={env} />
    </div>

    <pre
      class="px-3 py-3 bg-canvas border border-border rounded-md text-[12px] font-mono whitespace-pre-wrap text-ink-2 select-all"
    >{curlExample}</pre>

    <div class="mt-3 flex items-center gap-3">
      <Button variant="secondary" onclick={copy}>
        <Icon name="Copy" size={13} /> Copy
      </Button>
      <span class="text-[12px] text-pass-ink tabular-nums" aria-live="polite">{copied ? 'Copied' : ''}</span>
    </div>

    <h2 class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mt-10 mb-2 font-medium">Supported emitters</h2>
    <ul class="text-[13px] space-y-1 text-ink-2 list-disc list-inside marker:text-ink-3">
      <li><code class="font-mono">@cucumber/cucumber</code> (Node): <code class="font-mono">--format json:cucumber.json</code></li>
      <li>cucumber-jvm (Java/Maven): <code class="font-mono">--plugin json:target/cucumber.json</code></li>
      <li>godog (Go): <code class="font-mono">-f cucumber</code></li>
      <li>pytest-bdd (Python): <code class="font-mono">--cucumberjson</code></li>
      <li>SpecFlow (.NET): official cucumber JSON plugin</li>
    </ul>

    <h2 class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mt-10 mb-2 font-medium">Response shape</h2>
    <pre
      class="px-3 py-3 bg-canvas border border-border rounded-md text-[12px] font-mono whitespace-pre-wrap text-ink-2"
    >{`{
  "run_id":            "<uuid>",
  "status":            "PASSED" | "FAILED" | "SKIPPED",
  "scenarios_matched": <int>,
  "scenarios_unknown": <int>,
  "warnings":          ["..."]
}`}</pre>

    <h2 class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mt-10 mb-2 font-medium">Error codes</h2>
    <ul class="text-[13px] space-y-1 text-ink-2">
      <li><code class="font-mono">400</code> — missing project header, invalid JSON, or unparseable cucumber payload</li>
      <li><code class="font-mono">404</code> — no feature in the project matches the <code class="font-mono">Feature:</code> name</li>
      <li><code class="font-mono">500</code> — DB/storage failure</li>
    </ul>
  </section>
</div>
