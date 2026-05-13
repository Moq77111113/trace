export type Toast = {
  id:        string;
  message:   string;
  kind:      'info' | 'success' | 'error';
  timeout:   number;
};

const list = $state<Toast[]>([]);

export const toasts = {
  get list(): readonly Toast[] {
    return list;
  },
};

export function toast(message: string, kind: Toast['kind'] = 'info', timeout = 3500): void {
  const id = crypto.randomUUID();
  list.push({ id, message, kind, timeout });

  setTimeout(() => {
    const i = list.findIndex((t) => t.id === id);
    if (i >= 0) list.splice(i, 1);
  }, timeout);
}
