export type SignupState = {
	signupBudget: number;
	signupWindowEndsAt: Date | null;
};

export function isSignupOpen(state: SignupState, now: Date = new Date()): boolean {
	if (state.signupBudget <= 0) return false;
	if (state.signupWindowEndsAt && state.signupWindowEndsAt <= now) return false;
	return true;
}
