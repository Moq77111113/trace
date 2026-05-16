import type { Session } from '$lib/server/auth';
import type { Accent, Theme } from '$lib/theme';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			session: Session | null;
			user: { id: string; email: string; name: string | null } | null;
			theme: Theme;
			accent: Accent;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
