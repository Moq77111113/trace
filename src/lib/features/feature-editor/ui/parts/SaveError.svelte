<script lang="ts">
  type Props = { message: string };

  let { message }: Props = $props();
</script>

<p
  class="px-4 py-2 text-[12px] text-fail-ink bg-fail-soft border-b border-fail/30"
  role="alert"
>{message}</p>
