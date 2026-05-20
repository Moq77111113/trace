import { AsyncLocalStorage } from 'node:async_hooks';

export type AdminResetCtx = { capturedUrl: string | null };

export const adminResetCtx = new AsyncLocalStorage<AdminResetCtx>();
