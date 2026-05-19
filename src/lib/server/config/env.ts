import { env } from '$env/dynamic/private';

export function readEnv(key: string): string | undefined {
	const v = env[key];
	return v ? v : undefined;
}

export function requireEnv(key: string): string {
	const v = readEnv(key);
	if (!v) throw new Error(`${key} is not set`);
	return v;
}
