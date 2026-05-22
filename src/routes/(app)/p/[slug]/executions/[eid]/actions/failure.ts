import { fail } from '@sveltejs/kit';

const HTTP_STATUS_BY_MESSAGE: ReadonlyArray<readonly [RegExp, number]> = [
  [/not running/i,     409],
  [/only allowed on/i, 409],
  [/too large/i,       413],
  [/not found/i,       404],
];

export function failureFor(error: unknown) {
  const message = error instanceof Error ? error.message : 'unexpected error';
  const status  = HTTP_STATUS_BY_MESSAGE.find(([pattern]) => pattern.test(message))?.[1] ?? 500;
  return fail(status, { error: message });
}
