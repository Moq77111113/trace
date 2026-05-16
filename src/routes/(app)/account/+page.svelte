<script lang="ts">
  import { goto } from '$app/navigation';
  import Button   from '$lib/components/ui/Button.svelte';
  import Icon     from '$lib/components/ui/Icon.svelte';
  import { applyTheme, applyAccent } from '$lib/theme.client';
  import { ACCENTS, type Accent, type Theme } from '$lib/theme';
  import { createAuthApi } from '$lib/auth/api';

  let { data } = $props();

  // svelte-ignore state_referenced_locally
  let theme  = $state<Theme>(data.theme);
  // svelte-ignore state_referenced_locally
  let accent = $state<Accent>(data.accent);

  function setTheme(t: Theme) {
    theme = t;
    applyTheme(t);
  }

  function setAccent(a: Accent) {
    accent = a;
    applyAccent(a);
  }

  const ACCENT_HEX: Record<Accent, string> = {
    pink:  'oklch(0.66 0.22 350)',
    amber: 'oklch(0.66 0.16 60)',
    cyan:  'oklch(0.66 0.13 210)',
    lime:  'oklch(0.68 0.18 130)'
  };

  const auth = createAuthApi();
  let signingOut = $state(false);

  async function signOut() {
    signingOut = true;
    await auth.signOut();
    await goto('/login');
  }

  function userInitials(): string {
    const src = data.user.name?.trim() || data.user.email.split('@')[0] || '?';
    return src
      .split(/[\s._-]+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || '?';
  }
</script>

<div class="flex-1 min-h-0 overflow-auto p-7 max-lg:p-6 max-md:p-4">
  <section class="max-w-2xl">
    <header class="mb-6">
      <h1 class="text-[20px] font-semibold tracking-tight">Account</h1>
      <p class="text-[13px] text-ink-3 mt-1">Personal settings — applies to you across all projects.</p>
    </header>

    <section class="bg-surface border border-border rounded-xl p-5 mb-4">
      <h2 class="text-[14px] font-semibold tracking-tight mb-3">Profile</h2>
      <div class="flex items-center gap-3">
        <span class="w-10 h-10 rounded-full bg-surface-2 border border-border grid place-items-center text-ink-2 text-[13px] font-semibold shrink-0">
          {userInitials()}
        </span>
        <div class="min-w-0 flex-1">
          <div class="text-[14px] font-medium">{data.user.name ?? data.user.email.split('@')[0]}</div>
          <div class="text-[12px] text-ink-3 font-mono">{data.user.email}</div>
        </div>
      </div>
    </section>

    <section class="bg-surface border border-border rounded-xl p-5 mb-4">
      <h2 class="text-[14px] font-semibold tracking-tight mb-1">Appearance</h2>
      <p class="text-[12px] text-ink-3 mb-4">Theme and accent are personal — they sync via a cookie and apply on every device you sign in from.</p>

      <div class="mb-5">
        <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-2 font-medium">Theme</div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex items-center gap-2 h-[30px] px-3 text-[12.5px] rounded-md border cursor-pointer {theme === 'light' ? 'bg-surface text-ink border-border-strong' : 'bg-surface text-ink-2 border-border hover:border-border-strong'}"
            onclick={() => setTheme('light')}
            aria-pressed={theme === 'light'}
          >
            <Icon name="Sun" size={13} /> Light
          </button>
          <button
            type="button"
            class="flex items-center gap-2 h-[30px] px-3 text-[12.5px] rounded-md border cursor-pointer {theme === 'dark' ? 'bg-surface text-ink border-border-strong' : 'bg-surface text-ink-2 border-border hover:border-border-strong'}"
            onclick={() => setTheme('dark')}
            aria-pressed={theme === 'dark'}
          >
            <Icon name="Moon" size={13} /> Dark
          </button>
        </div>
      </div>

      <div>
        <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-2 font-medium">Accent</div>
        <div class="flex items-center gap-2.5">
          {#each ACCENTS as a (a)}
            {@const active = accent === a}
            <button
              type="button"
              class="group flex flex-col items-center gap-1.5 cursor-pointer"
              onclick={() => setAccent(a)}
              aria-pressed={active}
              aria-label="Accent {a}"
            >
              <span
                class="w-7 h-7 rounded-full border border-border transition-transform group-hover:scale-110 {active ? 'ring-2 ring-offset-2 ring-offset-surface ring-ink-2' : ''}"
                style:background={ACCENT_HEX[a]}
              ></span>
              <span class="text-[10.5px] uppercase tracking-[0.07em] text-ink-3 {active ? 'text-ink' : ''}">{a}</span>
            </button>
          {/each}
        </div>
      </div>
    </section>

    <section class="bg-surface border border-border rounded-xl p-5">
      <h2 class="text-[14px] font-semibold tracking-tight mb-1">Session</h2>
      <p class="text-[12px] text-ink-3 mb-4">Signed in as <code class="font-mono text-ink-2">{data.user.email}</code></p>
      <Button variant="danger" onclick={signOut} disabled={signingOut}>Sign out</Button>
    </section>
  </section>
</div>
