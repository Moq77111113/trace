/**
 * Strips File entries from a FormData snapshot so the result is safe to pass
 * to a zod schema expecting `Record<string, string>`. File uploads go through
 * a separate path (see attachments in M3+); this helper is for plain form fields.
 */
export function stringFields(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}
