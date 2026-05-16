<script lang="ts">
  type Props = {
    width?:  string | number;
    height?: string | number;
    radius?: string | number;
    class?:  string;
  };

  let {
    width  = '100%',
    height = '14px',
    radius = '4px',
    class: cls = ''
  }: Props = $props();

  const cssWidth  = $derived(typeof width  === 'number' ? `${width}px`  : width);
  const cssHeight = $derived(typeof height === 'number' ? `${height}px` : height);
  const cssRadius = $derived(typeof radius === 'number' ? `${radius}px` : radius);
</script>

<span
  class="inline-block bg-gradient-to-r from-surface-2 via-surface to-surface-2 bg-[length:200%_100%] [animation:skshim_1.8s_ease-in-out_infinite] {cls}"
  style:width={cssWidth}
  style:height={cssHeight}
  style:border-radius={cssRadius}
  aria-hidden="true"
></span>
