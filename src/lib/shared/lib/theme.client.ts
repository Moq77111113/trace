import type { Accent, Theme } from './theme';

async function persist(payload: { theme?: Theme; accent?: Accent }) {
	await fetch('/api/theme', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(payload)
	});
}

export function applyTheme(theme: Theme) {
	document.documentElement.dataset.theme = theme;
	void persist({ theme });
}

export function applyAccent(accent: Accent) {
	document.documentElement.dataset.accent = accent;
	void persist({ accent });
}
