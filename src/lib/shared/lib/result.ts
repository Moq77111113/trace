export type Ok<T>     = { ok: true;  value: T };
export type Err<E>    = { ok: false; error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok  = <T>(value: T): Ok<T>  => ({ ok: true,  value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/**
 * Throw if the result is an error. Use at boundaries where the caller cannot
 * meaningfully recover — preserves the discriminant for the rest of the chain.
 */
export function unwrap<T, E>(r: Result<T, E>): T {
  if (r.ok) return r.value;
  throw new Error(typeof r.error === 'string' ? r.error : 'unwrap on Err');
}
