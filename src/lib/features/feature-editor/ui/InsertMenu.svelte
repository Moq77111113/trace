<script lang="ts">
  import { DropdownMenu } from 'bits-ui';
  import Icon from '$lib/shared/ui/Icon.svelte';
  import type { Snippet } from '$lib/shared/gherkin/snippets';

  type Props = {
    snippets: Snippet[];
    onInsert: (snippet: Snippet) => void;
  };

  let { snippets, onInsert }: Props = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class="inline-flex items-center gap-1.5 h-[30px] px-3 text-[12.5px] font-medium rounded-md bg-surface text-ink border border-border hover:bg-surface-2 hover:border-border-strong cursor-pointer"
  >
    Insert <Icon name="ChevronDown" size={13} />
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      sideOffset={4}
      align="end"
      class="min-w-[200px] bg-surface border border-border rounded-lg shadow-[var(--shadow-pop)] p-1 z-50"
    >
      {#each snippets as snippet (snippet.key)}
        <DropdownMenu.Item
          class="px-2.5 py-1.5 text-[12.5px] text-ink-2 rounded-sm cursor-pointer data-[highlighted]:bg-surface-2 data-[highlighted]:text-ink outline-none"
          onSelect={() => onInsert(snippet)}
        >
          {snippet.label}
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
