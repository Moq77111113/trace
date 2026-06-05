import type { SourceAdapter, SourceFile } from './zephyr-atm';
import { zephyrAtmAdapter } from './zephyr-atm';

/** All source adapters, in detection order. CSV is added in a later plan. */
export const ADAPTERS: SourceAdapter[] = [zephyrAtmAdapter];

/** Return the first adapter that recognises the file, or null when none match. */
export function detectAdapter(file: SourceFile): SourceAdapter | null {
  return ADAPTERS.find((adapter) => adapter.detect(file)) ?? null;
}
