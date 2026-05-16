<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import Button    from '$lib/shared/ui/Button.svelte';
  import Icon      from '$lib/shared/ui/Icon.svelte';
  import PageTitle from '$lib/shared/ui/PageTitle.svelte';
  import { applyTheme, applyAccent } from '$lib/shared/lib/theme.client';
  import { ACCENTS, type Accent, type Theme } from '$lib/shared/lib/theme';
  import { createAuthApi } from '$lib/features/auth/api/client';
  import { locales, getLocale, setLocale, type Locale } from '$lib/paraglide/runtime';
  import * as m from '$lib/paraglide/messages';

  let { data } = $props();

  let theme  = $state<Theme>(untrack(() => data.theme));
  let accent = $state<Accent>(untrack(() => data.accent));

  const currentLocale = $derived(getLocale());

  function chooseLocale(l: Locale) {
    if (l !== currentLocale) setLocale(l);
  }

  const LOCALE_LABEL: Record<Locale, string> = {
    en: 'English',
    fr: 'Français'
  };

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

<PageTitle title={m.page_title_account()} />

<section class="max-w-2xl">
  <header class="mb-6">
    <h1 class="text-[20px] font-semibold tracking-tight">{m.page_title_account()}</h1>
    <p class="text-[13px] text-ink-3 mt-1">{m.account_subtitle()}</p>
  </header>

  <section class="bg-surface border border-border rounded-xl p-5 mb-4">
    <h2 class="text-[14px] font-semibold tracking-tight mb-3">{m.account_profile()}</h2>
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
    <h2 class="text-[14px] font-semibold tracking-tight mb-1">{m.account_appearance()}</h2>
    <p class="text-[12px] text-ink-3 mb-4">{m.account_appearance_body()}</p>

    <div class="mb-5">
      <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-2 font-medium">{m.account_theme()}</div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex items-center gap-2 h-[30px] px-3 text-[12.5px] rounded-md border cursor-pointer {theme === 'light' ? 'bg-surface text-ink border-border-strong' : 'bg-surface text-ink-2 border-border hover:border-border-strong'}"
          onclick={() => setTheme('light')}
          aria-pressed={theme === 'light'}
        >
          <Icon name="Sun" size={13} /> {m.account_theme_light()}
        </button>
        <button
          type="button"
          class="flex items-center gap-2 h-[30px] px-3 text-[12.5px] rounded-md border cursor-pointer {theme === 'dark' ? 'bg-surface text-ink border-border-strong' : 'bg-surface text-ink-2 border-border hover:border-border-strong'}"
          onclick={() => setTheme('dark')}
          aria-pressed={theme === 'dark'}
        >
          <Icon name="Moon" size={13} /> {m.account_theme_dark()}
        </button>
      </div>
    </div>

    <div>
      <div class="text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-2 font-medium">{m.account_accent()}</div>
      <div class="flex items-center gap-2.5">
        {#each ACCENTS as a (a)}
          {@const active = accent === a}
          <button
            type="button"
            class="group flex flex-col items-center gap-1.5 cursor-pointer"
            onclick={() => setAccent(a)}
            aria-pressed={active}
            aria-label={`${m.account_accent()} ${a}`}
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

  <section class="bg-surface border border-border rounded-xl p-5 mb-4">
    <h2 class="text-[14px] font-semibold tracking-tight mb-1">{m.account_language()}</h2>
    <p class="text-[12px] text-ink-3 mb-4">{m.account_language_body()}</p>
    <div class="flex items-center gap-2">
      {#each locales as l (l)}
        {@const active = currentLocale === l}
        <button
          type="button"
          class="h-[30px] px-3 text-[12.5px] rounded-md border cursor-pointer {active ? 'bg-surface text-ink border-border-strong' : 'bg-surface text-ink-2 border-border hover:border-border-strong'}"
          onclick={() => chooseLocale(l)}
          aria-pressed={active}
        >
          {LOCALE_LABEL[l]}
        </button>
      {/each}
    </div>
  </section>

  <section class="bg-surface border border-border rounded-xl p-5">
    <h2 class="text-[14px] font-semibold tracking-tight mb-1">{m.account_session()}</h2>
    <p class="text-[12px] text-ink-3 mb-4">{m.account_signed_in_as()} <code class="font-mono text-ink-2">{data.user.email}</code></p>
    <Button variant="danger" onclick={signOut} disabled={signingOut}>{m.account_sign_out()}</Button>
  </section>
</section>
