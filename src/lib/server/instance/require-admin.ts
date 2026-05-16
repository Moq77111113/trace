import { error } from '@sveltejs/kit';

type AdminUser = { id: string; email: string; name: string | null; role: 'admin' | 'user' };

export function requireAdmin(user: { role: 'admin' | 'user' } & Record<string, unknown> | null): AdminUser {
	if (!user || user.role !== 'admin') {
		throw error(403, 'Admin access required');
	}
	return user as unknown as AdminUser;
}
