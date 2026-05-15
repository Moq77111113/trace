export type DisplayUser = { name: string | null; email: string };

export function userInitials(user: DisplayUser): string {
	const src = user.name?.trim() || user.email.split('@')[0] || '?';
	const letters = src.split(/[\s._-]+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('');
	return letters || '?';
}

export function userDisplayName(user: DisplayUser): string {
	return user.name?.trim() || user.email;
}
