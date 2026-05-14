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

export const gherkinThemeRules: monaco.editor.ITokenThemeRule[] = [
	{ token: 'keyword', foreground: '#569cd6' },
	{ token: 'type.identifier', foreground: '#c586c0' },
	{ token: 'tag', foreground: '#d7ba7d' },
	{ token: 'comment', foreground: '#6a9955', fontStyle: 'italic' },
	{ token: 'string', foreground: '#ce9178' },
	{ token: 'variable', foreground: '#9cdcfe' },
	{ token: 'number', foreground: '#b5cea8' }
];
