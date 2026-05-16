type MsgFn = (inputs: { count: number }) => string;

export function plural(count: number, one: MsgFn, other: MsgFn): string {
  return (count === 1 ? one : other)({ count });
}
