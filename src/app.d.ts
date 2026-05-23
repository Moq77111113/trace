import type { Session } from '$lib/server/auth';
import type { Guard } from '$lib/server/authz/guard';
import type { Accent, Theme } from '$lib/shared/lib/theme';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			session: Session | null;
			user: {
				id: string;
				email: string;
				name: string | null;
				role: 'admin' | 'user';
				welcomedAt: Date | null;
			} | null;
			theme: Theme;
			accent: Accent;
			guard: Guard;
		}

		interface Error {
			message: string;
			errorId?: string;
			code?:    string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
