 codex/add-database-logging-for-sql-queries-6lmq8c
import { AsyncLocalStorage } from 'async_hooks';

const storage = new AsyncLocalStorage();

export function runWithRequestContext(context, callback) {
  return storage.run(context, callback);
}

export function getRequestContext() {
  return storage.getStore() ?? null;
}

export function updateRequestContext(patch = {}) {
  const store = storage.getStore();
  if (!store) {
    return;
  }

  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      store[key] = value;
    }
  }
}
