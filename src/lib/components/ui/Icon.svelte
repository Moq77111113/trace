<script lang="ts" module>
  import { icons } from "lucide-svelte";
  import type { Component } from "svelte";

  export type IconName = keyof typeof icons;
  type LucideIcon = Component<{ size?: number; class?: string }>;
</script>

<script lang="ts">
  type Props = { name: IconName; size?: number; class?: string };
  let { name, size = 16, class: cls = "" }: Props = $props();

  const Component = $derived(icons[name] as unknown as LucideIcon);
</script>

<Component {size} class={cls} />
