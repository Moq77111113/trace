import type * as monaco from 'monaco-editor';

export const gherkinLanguage: monaco.languages.IMonarchLanguage = {
	defaultToken: '',
	tokenPostfix: '.gherkin',
	keywords: ['Feature', 'Background', 'Rule', 'Scenario', 'Scenario Outline', 'Examples'],
	steps: ['Given', 'When', 'Then', 'And', 'But'],
	tokenizer: {
		root: [
			[/^\s*#.*$/, 'comment'],
			[/@\w[-\w]*/, 'tag'],
			[/^\s*(Feature|Background|Rule|Scenario Outline|Scenario|Examples):/, 'keyword'],
			[/^\s+(Given|When|Then|And|But)\b/, 'type.identifier'],
			[/"[^"]*"/, 'string'],
			[/'[^']*'/, 'string'],
			[/\|/, 'delimiter'],
			[/<[^>]+>/, 'variable'],
			[/\d+/, 'number']
		]
	}
};

/** Light-theme token colors. Approximate the Trace `--code-*` OKLCH tokens in hex. */
export const gherkinLightRules: monaco.editor.ITokenThemeRule[] = [
	{ token: 'keyword',         foreground: '973478', fontStyle: 'bold' },
	{ token: 'type.identifier', foreground: '7c4ba0', fontStyle: 'bold' },
	{ token: 'tag',             foreground: '386eaa' },
	{ token: 'comment',         foreground: '8b8a80', fontStyle: 'italic' },
	{ token: 'string',          foreground: '347a52' },
	{ token: 'variable',        foreground: '386eaa' },
	{ token: 'number',          foreground: '8a611a' },
	{ token: 'delimiter',       foreground: 'b0aea4' }
];

/** Dark-theme token colors. Approximate the Trace `--code-*` OKLCH tokens in hex. */
export const gherkinDarkRules: monaco.editor.ITokenThemeRule[] = [
	{ token: 'keyword',         foreground: 'e996d8', fontStyle: 'bold' },
	{ token: 'type.identifier', foreground: 'c1a3e0', fontStyle: 'bold' },
	{ token: 'tag',             foreground: '90c2e6' },
	{ token: 'comment',         foreground: '76787e', fontStyle: 'italic' },
	{ token: 'string',          foreground: '8acaa1' },
	{ token: 'variable',        foreground: '90c2e6' },
	{ token: 'number',          foreground: 'd9b677' },
	{ token: 'delimiter',       foreground: '5a5e66' }
];
