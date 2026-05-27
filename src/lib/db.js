// src/lib/db.js
import { openDB } from 'idb';

const DB_NAME = 'tabmate-db';
const DB_VERSION = 1;

const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('keyval')) {
        db.createObjectStore('keyval');
      }
    },
  });
};

let dbPromise = null;
const getDB = () => {
  if (!dbPromise) dbPromise = initDB();
  return dbPromise;
};

export const db = {
  async get(key) {
    const db = await getDB();
    return db.get('keyval', key);
  },
  async set(key, val) {
    const db = await getDB();
    return db.put('keyval', val, key);
  },
  async del(key) {
    const db = await getDB();
    return db.delete('keyval', key);
  },
  async clear() {
    const db = await getDB();
    return db.clear('keyval');
  },
};
