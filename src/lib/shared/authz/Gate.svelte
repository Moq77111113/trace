<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Action } from '$lib/server/authz/actions';
  import { can } from './can';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    /** The verb required to use the wrapped control — the same one its server action authorizes. */
    can: Action;
    /** Keep the control visible but disabled with a tooltip, instead of hiding it. Buttons/inputs only. */
    disable?: boolean;
    /** Tooltip shown in `disable` mode; defaults to a generic permission message. */
    reason?: string;
    children: Snippet;
  };

  let { can: action, disable = false, reason, children }: Props = $props();

  const allowed = $derived(can(action));
</script>

{#if allowed}
  {@render children()}
{:else if disable}
  <fieldset
    disabled
    title={reason ?? m.gate_no_permission()}
    class="inline-flex m-0 p-0 border-0 opacity-50 cursor-not-allowed"
  >
    {@render children()}
  </fieldset>
{/if}
