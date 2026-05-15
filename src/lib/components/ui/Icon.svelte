<script lang="ts" module>
  import Activity      from 'lucide-svelte/icons/activity';
  import Check         from 'lucide-svelte/icons/check';
  import ChevronDown   from 'lucide-svelte/icons/chevron-down';
  import ChevronRight  from 'lucide-svelte/icons/chevron-right';
  import GripVertical  from 'lucide-svelte/icons/grip-vertical';
  import Inbox         from 'lucide-svelte/icons/inbox';
  import Play          from 'lucide-svelte/icons/play';

  const registry = { Activity, Check, ChevronDown, ChevronRight, GripVertical, Inbox, Play };

  export type IconName = keyof typeof registry;
</script>

<script lang="ts">
  type Props = { name: IconName; size?: number; class?: string };
  let { name, size = 16, class: cls = '' }: Props = $props();

  const Component = $derived(registry[name]);
</script>

<Component {size} class={cls} />
