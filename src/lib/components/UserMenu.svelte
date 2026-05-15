<script lang="ts">
  import { createAuthApi } from '$lib/auth/api';
  import { userInitials, userDisplayName } from '$lib/auth/format';

  type Props = { user: { id: string; email: string; name: string | null } };
  let { user }: Props = $props();

  let open = $state(false);

  const authApi   = createAuthApi();
  const initials  = $derived(userInitials(user));
  const display   = $derived(userDisplayName(user));

  async function signOut() {
    await authApi.signOut();
    location.href = '/login';
  }

  function onWindowMousedown(event: MouseEvent) {
    if (!open) return;
    const target = event.target as HTMLElement;
    if (!target.closest('[data-user-menu]')) open = false;
  }
</script>

<svelte:window onmousedown={onWindowMousedown} />

<div class="relative" data-user-menu>
  <button
    type="button"
    onclick={() => (open = !open)}
    class="h-8 w-8 rounded-full bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold flex items-center justify-center transition"
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label="User menu"
  >
    {initials}
  </button>

  {#if open}
    <div
      role="menu"
      class="absolute right-0 mt-2 w-56 bg-surface-800 border border-surface-700 rounded shadow-lg p-3 text-sm z-50"
    >
      <div class="font-medium text-surface-100 truncate">{display}</div>
      <div class="text-xs text-surface-400 truncate">{user.email}</div>

      <hr class="my-2 border-surface-700" />

      <button
        type="button"
        class="text-sm text-state-failed hover:underline"
        onclick={signOut}
      >
        Sign out
      </button>
    </div>
  {/if}
</div>
