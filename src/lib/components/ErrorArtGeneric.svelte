<script lang="ts">
  type Props = { status: number };
  let { status }: Props = $props();
</script>

<svg viewBox="0 0 320 140" class="w-full h-full" aria-hidden="true">
  <defs>
    <pattern id="trace-grid-other" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border)" stroke-width="0.5" />
    </pattern>
  </defs>
  <rect width="320" height="140" fill="url(#trace-grid-other)" />
  <g transform="translate(160 60)" fill="none" stroke="var(--ink-3)" stroke-width="1.5" stroke-linecap="round">
    <circle r="22" />
    <line x1="-15" y1="-15" x2="15" y2="15" />
  </g>
  <text x="160" y="120" text-anchor="middle" font-family="var(--font-mono)" font-size="11" fill="var(--ink-mute)">
    {status}
  </text>
</svg>
