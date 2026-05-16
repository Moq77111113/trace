<script lang="ts">
  import Icon from '$lib/shared/ui/Icon.svelte';
  import Kbd  from '$lib/shared/ui/Kbd.svelte';

  type Props = {
    value:       string;
    inputRef:    HTMLInputElement | undefined;
    onKeyDown:   (e: KeyboardEvent) => void;
  };

  let { value = $bindable(), inputRef = $bindable(), onKeyDown }: Props = $props();
</script>

<div class="flex items-center gap-2.5 px-4 py-3 border-b border-border">
  <Icon name="Search" size={14} class="text-ink-3" />
  <input
    bind:this={inputRef}
    bind:value
    onkeydown={onKeyDown}
    type="text"
    placeholder="Search features…"
    class="flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-ink-3 outline-none border-0"
    autocomplete="off"
    spellcheck="false"
  />
  <Kbd>ESC</Kbd>
</div>
