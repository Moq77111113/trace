<script lang="ts">
  const sectionHeading = 'text-[11px] uppercase tracking-[0.07em] text-ink-3 mt-10 mb-2 font-medium';
  const codeBlock      = 'px-3 py-3 bg-canvas border border-border rounded-md text-[12px] font-mono whitespace-pre-wrap text-ink-2';
</script>

<h2 class={sectionHeading}>Supported emitters</h2>
<ul class="text-[13px] space-y-1 text-ink-2 list-disc list-inside marker:text-ink-3">
  <li><code class="font-mono">@cucumber/cucumber</code> (Node): <code class="font-mono">--format json:cucumber.json</code></li>
  <li>cucumber-jvm (Java/Maven): <code class="font-mono">--plugin json:target/cucumber.json</code></li>
  <li>godog (Go): <code class="font-mono">-f cucumber</code></li>
  <li>pytest-bdd (Python): <code class="font-mono">--cucumberjson</code></li>
  <li>SpecFlow (.NET): official cucumber JSON plugin</li>
</ul>

<h2 class={sectionHeading}>Request headers</h2>
<ul class="text-[13px] space-y-1 text-ink-2 list-disc list-inside marker:text-ink-3">
  <li>Required: <code class="font-mono">Authorization: Bearer &lt;YOUR_KEY&gt;</code>. The key resolves the project, no project header needed.</li>
  <li>Optional enrichment: <code class="font-mono">X-Environment</code>, <code class="font-mono">X-CI-Branch</code>, <code class="font-mono">X-CI-Commit</code>, <code class="font-mono">X-CI-Source</code>.</li>
</ul>

<h2 class={sectionHeading}>Response shape</h2>
<pre class={codeBlock}>{`{
  "status":           "PASSED" | "FAILED" | "SKIPPED",
  "executions": [
    {
      "feature_code":      "auth-3",
      "execution_id":      "exec_...",
      "status":            "PASSED",
      "scenarios_matched": 4,
      "matched_via":       "code"
    }
  ],
  "unknown_features": [],
  "warnings":         []
}`}</pre>

<h2 class={sectionHeading}>Status codes</h2>
<ul class="text-[13px] space-y-1 text-ink-2">
  <li><code class="font-mono">200 OK</code>: all features in the payload matched.</li>
  <li><code class="font-mono">207 Multi-Status</code>: partial match (some features unknown, see <code class="font-mono">unknown_features</code>).</li>
  <li><code class="font-mono">404 Not Found</code>: zero features matched (<code class="font-mono">INGEST_NO_FEATURES_MATCHED</code>).</li>
  <li><code class="font-mono">400 Bad Request</code>: parse failure (<code class="font-mono">PARSE_EMPTY_PAYLOAD</code>, <code class="font-mono">PARSE_INVALID_JSON</code>, <code class="font-mono">PARSE_SCHEMA_INVALID</code>).</li>
  <li><code class="font-mono">401 Unauthorized</code>: auth failure (<code class="font-mono">CI_AUTH_HEADER_MISSING</code>, <code class="font-mono">CI_AUTH_SCHEME_INVALID</code>, <code class="font-mono">CI_AUTH_KEY_INVALID</code>).</li>
  <li><code class="font-mono">500 Internal Server Error</code>: key has no associated project (<code class="font-mono">CI_AUTH_KEY_NO_PROJECT</code>), configuration error.</li>
</ul>
