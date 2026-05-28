<script lang="ts">
  import '../../app.css';

  let { children } = $props();
</script>

<div class="report-shell mx-auto max-w-[820px] px-8 py-10 bg-bg text-ink">
  {@render children()}
</div>

<style>
  @media print {
    :global(body) { background: white; }
    .report-shell { max-width: none; padding: 0; }
  }
</style>
