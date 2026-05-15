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

		const { gherkinLanguage, gherkinThemeRules } = await import('$lib/gherkin/monarch-grammar');
		monaco.languages.register({ id: 'gherkin' });
		monaco.languages.setMonarchTokensProvider('gherkin', gherkinLanguage);
		monaco.editor.defineTheme('trace-dark', {
			base: 'vs-dark',
			inherit: true,
			rules: gherkinThemeRules,
			colors: { 'editor.background': '#0d1117' }
		});

		registered = true;
		return monaco;
	}
</script>

<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type * as Monaco from 'monaco-editor';

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
	let ready = $state(false);

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

	onMount(async () => {
		const m = await ensureRegistered();
		monaco = m;

		const ed = m.editor.create(containerEl, {
			value,
			language: 'gherkin',
			theme: 'trace-dark',
			minimap: { enabled: false },
			fontSize: 13,
			fontFamily: 'JetBrains Mono, ui-monospace, monospace',
			automaticLayout: true,
			scrollBeyondLastLine: false,
			padding: { top: 12 }
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

				const lastLine     = model.getLineCount();
				const lastColumn   = model.getLineMaxColumn(lastLine);
				const endsWithBlank = model.getLineLength(lastLine) === 0;
				const prefix       = endsWithBlank ? '\n' : '\n\n';
				const range        = { startLineNumber: lastLine, startColumn: lastColumn, endLineNumber: lastLine, endColumn: lastColumn };

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

		applyMarkers();
		ready = true;
	});

	onDestroy(() => {
		providerHandle?.dispose();
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

<div class="relative w-full h-[640px] rounded-md border border-surface-600 overflow-hidden bg-[#0d1117]">
	<div bind:this={containerEl} class="absolute inset-0"></div>
	{#if !ready}
		<pre
			class="absolute inset-0 m-0 px-[26px] pt-3 font-mono text-[13px] leading-[1.5] text-surface-200 whitespace-pre overflow-hidden pointer-events-none"
		>{value}</pre>
	{/if}
</div>
