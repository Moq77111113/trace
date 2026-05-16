<script lang="ts" module>
	export type EditorApi = {
		insertAtCursor: (text: string) => void;
		appendText:     (text: string) => void;
		setText:        (text: string) => void;
		focus:          () => void;
	};

	let registered = false;

	async function ensureRegistered(): Promise<typeof import('monaco-editor')> {
		const monaco = await import('monaco-editor');
		if (registered) return monaco;

		const EditorWorker = (await import('monaco-editor/esm/vs/editor/editor.worker?worker')).default;
		self.MonacoEnvironment = { getWorker: () => new EditorWorker() };

		const { gherkinLanguage, gherkinLightRules, gherkinDarkRules } = await import(
			'$lib/shared/gherkin/monarch-grammar'
		);
		monaco.languages.register({ id: 'gherkin' });
		monaco.languages.setMonarchTokensProvider('gherkin', gherkinLanguage);

		monaco.editor.defineTheme('trace-light', {
			base:    'vs',
			inherit: false,
			rules:   gherkinLightRules,
			colors: {
				'editor.background':          '#ffffff',
				'editor.foreground':          '#322f2a',
				'editorLineNumber.foreground': '#b0aea4',
				'editorLineNumber.activeForeground': '#67635a',
				'editor.selectionBackground': '#f5d6ea',
				'editor.lineHighlightBackground': '#f6f5f1',
				'editorCursor.foreground':    '#322f2a'
			}
		});
		monaco.editor.defineTheme('trace-dark', {
			base:    'vs-dark',
			inherit: false,
			rules:   gherkinDarkRules,
			colors: {
				'editor.background':          '#1f222b',
				'editor.foreground':          '#e8e9eb',
				'editorLineNumber.foreground': '#5a5e66',
				'editorLineNumber.activeForeground': '#a8aab0',
				'editor.selectionBackground': '#4a2941',
				'editor.lineHighlightBackground': '#262932',
				'editorCursor.foreground':    '#e8e9eb'
			}
		});

		registered = true;
		return monaco;
	}

	function currentTheme(): 'trace-dark' | 'trace-light' {
		if (typeof document === 'undefined') return 'trace-light';
		return document.documentElement.dataset.theme === 'dark' ? 'trace-dark' : 'trace-light';
	}
</script>

<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type * as Monaco from 'monaco-editor';
	import Skeleton from '$lib/shared/ui/Skeleton.svelte';

	type Marker = { line: number; column?: number; message: string };

	type Props = {
		value:    string;
		onChange: (v: string) => void;
		markers?: Marker[];
		completionProvider?: (
			model: Monaco.editor.ITextModel,
			position: Monaco.Position
		) => Monaco.languages.CompletionList;
		api?: EditorApi | null;
	};

	let {
		value,
		onChange,
		markers = [],
		completionProvider,
		api = $bindable<EditorApi | null>(null),
	}: Props = $props();

	let containerEl: HTMLDivElement;
	let editor: Monaco.editor.IStandaloneCodeEditor | null = null;
	let monaco: typeof Monaco | null = null;
	let providerHandle: Monaco.IDisposable | null = null;
	let themeObserver: MutationObserver | null = null;
	let ready = $state(false);

	const skeletonLineWidths = ['65%', '40%', '55%', '70%', '30%', '50%', '60%', '45%', '38%', '52%'];

	function applyMarkers(): void {
		if (!editor || !monaco) return;

		const ed = editor;
		const m = monaco;
		const model = ed.getModel();
		if (!model) return;

		m.editor.setModelMarkers(
			model,
			'gherkin',
			markers.map((mk) => ({
				severity: m.MarkerSeverity.Error,
				startLineNumber: mk.line,
				startColumn: mk.column ?? 1,
				endLineNumber: mk.line,
				endColumn: (mk.column ?? 1) + 80,
				message: mk.message
			}))
		);
	}

	function refreshTheme(): void {
		if (!monaco) return;
		monaco.editor.setTheme(currentTheme());
	}

	onMount(async () => {
		const m = await ensureRegistered();
		monaco = m;

		const ed = m.editor.create(containerEl, {
			value,
			language: 'gherkin',
			theme:    currentTheme(),
			minimap:  { enabled: false },
			fontSize: 13,
			fontFamily: '"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
			automaticLayout: true,
			scrollBeyondLastLine: false,
			padding: { top: 14 },
			renderLineHighlight: 'none',
			scrollbar: { vertical: 'auto', horizontal: 'auto', useShadows: false }
		});
		editor = ed;

		ed.onDidChangeModelContent(() => onChange(ed.getValue()));

		api = {
			insertAtCursor(text: string): void {
				const selection = ed.getSelection();
				if (!selection) return;
				ed.executeEdits('snippet', [{ range: selection, text, forceMoveMarkers: true }]);
				ed.focus();
			},
			appendText(text: string): void {
				const model = ed.getModel();
				if (!model) return;

				const lastLine      = model.getLineCount();
				const lastColumn    = model.getLineMaxColumn(lastLine);
				const endsWithBlank = model.getLineLength(lastLine) === 0;
				const prefix        = endsWithBlank ? '\n' : '\n\n';
				const range         = { startLineNumber: lastLine, startColumn: lastColumn, endLineNumber: lastLine, endColumn: lastColumn };

				ed.executeEdits('snippet-append', [{ range, text: prefix + text, forceMoveMarkers: true }]);
				ed.focus();
			},
			setText(text: string): void {
				ed.setValue(text);
				ed.focus();
			},
			focus(): void {
				ed.focus();
			},
		};

		if (completionProvider) {
			const cp = completionProvider;
			providerHandle = m.languages.registerCompletionItemProvider('gherkin', {
				triggerCharacters: ['@', ' '],
				provideCompletionItems: (model, position) => cp(model, position)
			});
		}

		themeObserver = new MutationObserver(refreshTheme);
		themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

		applyMarkers();
		ready = true;
	});

	onDestroy(() => {
		providerHandle?.dispose();
		themeObserver?.disconnect();
		editor?.dispose();
		api = null;
	});

	$effect(() => {
		markers;
		applyMarkers();
	});

	$effect(() => {
		if (!editor) return;
		const ed = editor;
		if (ed.getValue() !== value) ed.setValue(value);
	});
</script>

<div class="relative w-full h-full min-h-[480px] bg-surface">
	<div bind:this={containerEl} class="absolute inset-0"></div>
	{#if !ready}
		<div
			class="absolute inset-0 px-6 pt-3.5 flex flex-col gap-[8px] pointer-events-none bg-surface"
			aria-hidden="true"
		>
			{#each skeletonLineWidths as w (w)}
				<Skeleton width={w} height="14px" />
			{/each}
		</div>
	{/if}
</div>
