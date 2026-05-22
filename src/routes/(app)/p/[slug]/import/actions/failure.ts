import { fail } from '@sveltejs/kit';

const HTTP_STATUS_BY_MESSAGE: ReadonlyArray<readonly [RegExp, number]> = [
  [/no files uploaded/i,   400],
  [/unsupported file/i,    400],
  [/exceeds .*(mb|byte)/i, 413],
  [/max .* files/i,        413],
  [/expired|not found/i,   404],
  [/concurrent edit/i,     409],
];

export function failureFor(error: unknown) {
  const message = error instanceof Error ? error.message : 'unexpected error';
  const status  = HTTP_STATUS_BY_MESSAGE.find(([pattern]) => pattern.test(message))?.[1] ?? 500;
  return fail(status, { error: message });
}
