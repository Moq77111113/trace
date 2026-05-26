import type { Session } from '$lib/server/auth';
import type { Authorizer } from '$lib/server/authz/authorizer';
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
			authz: Authorizer;
		}

		interface Error {
			message: string;
			errorId?: string;
			code?:    string;
		}
		interface PageData {
			capabilities?: import('$lib/server/authz/actions').Action[];
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
