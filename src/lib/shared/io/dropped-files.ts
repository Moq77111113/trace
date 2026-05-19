export type DroppedFile = { file: File; path: string };

export async function collectDroppedFiles(dt: DataTransfer): Promise<DroppedFile[]> {
	if (!hasEntryApi(dt)) return Array.from(dt.files).map((f) => ({ file: f, path: '' }));
	const entries = Array.from(dt.items)
		.map((it) => it.webkitGetAsEntry())
		.filter((x): x is FileSystemEntry => x !== null);
	return walk(entries, '');
}

export function filterByExtension(items: DroppedFile[], accept: string): DroppedFile[] {
	if (accept === '*' || !accept) return items;
	const exts = accept.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s.startsWith('.'));
	if (exts.length === 0) return items;
	return items.filter(({ file }) => exts.some((ext) => file.name.toLowerCase().endsWith(ext)));
}

function hasEntryApi(dt: DataTransfer): boolean {
	const first = dt.items[0];
	return first !== undefined && typeof first.webkitGetAsEntry === 'function';
}

async function walk(entries: FileSystemEntry[], prefix: string): Promise<DroppedFile[]> {
	const out: DroppedFile[] = [];
	for (const e of entries) {
		if (e.isFile) {
			const file = await asFile(e as FileSystemFileEntry);
			out.push({ file, path: prefix ? `${prefix}/${file.name}` : file.name });
		} else if (e.isDirectory) {
			const children = await readAll((e as FileSystemDirectoryEntry).createReader());
			out.push(...(await walk(children, prefix ? `${prefix}/${e.name}` : e.name)));
		}
	}
	return out;
}

const asFile = (e: FileSystemFileEntry): Promise<File> =>
	new Promise((res, rej) => e.file(res, rej));

async function readAll(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
	const all: FileSystemEntry[] = [];
	for (let batch = await readBatch(reader); batch.length > 0; batch = await readBatch(reader)) {
		all.push(...batch);
	}
	return all;
}

const readBatch = (r: FileSystemDirectoryReader): Promise<FileSystemEntry[]> =>
	new Promise((res, rej) => r.readEntries(res, rej));
