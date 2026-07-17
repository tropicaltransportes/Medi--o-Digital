import { openDB } from 'idb';

let _db;
async function getDb() {
  if (!_db) {
    _db = await openDB('medicao-v1', 1, {
      upgrade(db) {
        db.createObjectStore('cache', { keyPath: 'key' });
        db.createObjectStore('sync_queue', { keyPath: '_localId' });
      },
    });
  }
  return _db;
}

export async function cacheSave(key, value) {
  const db = await getDb();
  await db.put('cache', { key, value, ts: Date.now() });
}

export async function cacheLoad(key) {
  const db = await getDb();
  const row = await db.get('cache', key);
  return row?.value ?? null;
}

export async function queuePush(item) {
  const db = await getDb();
  await db.put('sync_queue', item);
}

export async function queueGetAll() {
  const db = await getDb();
  return db.getAll('sync_queue');
}

export async function queueRemove(localId) {
  const db = await getDb();
  await db.delete('sync_queue', localId);
}
