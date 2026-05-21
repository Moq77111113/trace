import { createAuthApi } from '$lib/shared/auth/client';
import { PASSWORD_MIN_LENGTH } from '$lib/shared/auth/constants';
import * as m from '$lib/paraglide/messages';

type Auth = ReturnType<typeof createAuthApi>;

export class ChangePasswordController {
	current: string        = $state('');
	next:    string        = $state('');
	confirm: string        = $state('');
	pending: boolean       = $state(false);
	error:   string | null = $state(null);
	success: boolean       = $state(false);

	constructor(private readonly auth: Auth = createAuthApi()) {}

	submit = async (): Promise<void> => {
		this.error   = null;
		this.success = false;

		if (this.next.length < PASSWORD_MIN_LENGTH) {
			this.error = m.error_password_too_short({ min: PASSWORD_MIN_LENGTH });
			return;
		}
		if (this.next !== this.confirm) {
			this.error = m.error_password_mismatch();
			return;
		}

		this.pending = true;
		const res = await this.auth.changePassword({
			currentPassword:     this.current,
			newPassword:         this.next,
			revokeOtherSessions: true,
		});
		this.pending = false;

		if (res.error) {
			this.error = m.error_current_password_incorrect();
			return;
		}
		this.success = true;
		this.current = '';
		this.next    = '';
		this.confirm = '';
	};
}
