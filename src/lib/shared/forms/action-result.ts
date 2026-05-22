type ResultLike =
  | { type: 'success';  data?: unknown }
  | { type: 'failure';  data?: unknown }
  | { type: 'redirect'; location: string }
  | { type: 'error';    error?: unknown };

export function failureMessage(result: ResultLike, fallback: string): string {
  if (result.type === 'failure') {
    const data = result.data;
    if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string') {
      return data.error;
    }
  }
  if (result.type === 'error' && result.error instanceof Error && result.error.message) {
    return result.error.message;
  }
  return fallback;
}

export function failureReason(result: ResultLike): string | null {
  if (result.type !== 'failure') return null;
  const data = result.data;
  if (typeof data === 'object' && data !== null && 'reason' in data && typeof data.reason === 'string') {
    return data.reason;
  }
  return null;
}
