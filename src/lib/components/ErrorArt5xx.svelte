<svg viewBox="0 0 320 140" class="w-full h-full" aria-hidden="true">
  <defs>
    <pattern id="trace-grid-5xx" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border)" stroke-width="0.5" />
    </pattern>
  </defs>
  <rect width="320" height="140" fill="url(#trace-grid-5xx)" />
  <g transform="translate(160 70)">
    <rect x="-44" y="-26" width="88" height="52" rx="6"   fill="var(--fail-soft)" stroke="var(--fail)" stroke-width="1" stroke-dasharray="3 3" opacity="0.7" />
    <rect x="-36" y="-18" width="72" height="6"  rx="1.5" fill="var(--fail)"  opacity="0.55" />
    <rect x="-36" y="-8"  width="48" height="6"  rx="1.5" fill="var(--ink-3)" opacity="0.6" />
    <rect x="-36" y="2"   width="60" height="6"  rx="1.5" fill="var(--ink-3)" opacity="0.4" />
    <rect x="-36" y="12"  width="34" height="6"  rx="1.5" fill="var(--ink-3)" opacity="0.3" />
    <line x1="-50" y1="-12" x2="50" y2="20" stroke="var(--fail)" stroke-width="1.5" stroke-linecap="round" />
  </g>
  <g font-family="var(--font-mono)" font-size="9" fill="var(--ink-mute)">
    <text x="14"  y="20">stack</text>
    <text x="14"  y="34">  at Trace.run()</text>
    <text x="14"  y="48">  at handler.ts:42</text>
    <text x="246" y="126">errno -1</text>
  </g>
</svg>
