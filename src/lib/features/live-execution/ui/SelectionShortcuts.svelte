<script lang="ts">
  import { useSelection } from '../model/context';
  import { attachShortcut, onPlainKey } from '../model/shortcuts';

  const selection = useSelection();

  $effect(() => {
    const offJump = attachShortcut(window, onPlainKey('j'),         () => selection.jumpToNextPending());
    const offDown = attachShortcut(window, onPlainKey('ArrowDown'), () => selection.moveDown());
    const offUp   = attachShortcut(window, onPlainKey('ArrowUp'),   () => selection.moveUp());
    return () => { offJump(); offDown(); offUp(); };
  });
</script>
