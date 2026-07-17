import { openDB } from 'idb';

let _db;
let _dbFailed = false;

async function getDb() {
  if (_dbFailed) return null;
  if (!_db) {
    try {
      _db = await openDB('medicao-v1', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('cache'))
            db.createObjectStore('cache', { keyPath: 'key' });
          if (!db.objectStoreNames.contains('sync_queue'))
            db.createObjectStore('sync_queue', { keyPath: '_localId' });
        },
      });
    } catch (e) {
      console.warn('[db] IndexedDB indisponível, modo sem cache:', e);
      _dbFailed = true;
      return null;
    }
  }
  return _db;
}

export async function cacheSave(key, value) {
  const db = await getDb();
  if (!db) return;
  try { await db.put('cache', { key, value, ts: Date.now() }); } catch { /* silent */ }
}

export async function cacheLoad(key) {
  const db = await getDb();
  if (!db) return null;
  try {
    const row = await db.get('cache', key);
    return row?.value ?? null;
  } catch { return null; }
}

export async function queuePush(item) {
  const db = await getDb();
  if (!db) return;
  try { await db.put('sync_queue', item); } catch { /* silent */ }
}

export async function queueGetAll() {
  const db = await getDb();
  if (!db) return [];
  try { return await db.getAll('sync_queue'); } catch { return []; }
}

export async function queueRemove(localId) {
  const db = await getDb();
  if (!db) return;
  try { await db.delete('sync_queue', localId); } catch { /* silent */ }
}
