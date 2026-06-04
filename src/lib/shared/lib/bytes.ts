/** Formats a byte count as a one-decimal kilobyte string, e.g. "2.0 KB". */
export function formatFileSize(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}
