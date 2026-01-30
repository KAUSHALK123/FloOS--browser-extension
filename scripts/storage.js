// Unified storage for floOS: tasks and bookmarks (localStorage-backed)
const KEY_TASKS = "floOS_tasks_v1";
const KEY_BOOKMARKS = "floOS_bookmarks_v1";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Tasks
export function getTasks(dateKey) {
  const data = readJson(KEY_TASKS, {});
  return data[dateKey] || [];
}

export function saveTask(dateKey, task) {
  const data = readJson(KEY_TASKS, {});
  if (!data[dateKey]) data[dateKey] = [];
  const toSave = {
    id: crypto.randomUUID(),
    subject: task.subject || "",
    description: task.description || "",
    link: task.link || "",
    createdAt: task.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  data[dateKey].push(toSave);
  writeJson(KEY_TASKS, data);
  return toSave;
}

// Bookmarks
// Schema: { [category: string]: Array<{id,title,url,createdAt,updatedAt}> }
export function getBookmarks(category) {
  const data = readJson(KEY_BOOKMARKS, {});
  return data[category] || [];
}

export function addBookmark(category, bookmark) {
  const data = readJson(KEY_BOOKMARKS, {});
  if (!data[category]) data[category] = [];
  const toSave = {
    id: crypto.randomUUID(),
    title: bookmark.title?.trim() || bookmark.url,
    url: bookmark.url,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  data[category].push(toSave);
  writeJson(KEY_BOOKMARKS, data);
  return toSave;
}

export function removeBookmark(category, id) {
  const data = readJson(KEY_BOOKMARKS, {});
  if (!data[category]) return false;
  const before = data[category].length;
  data[category] = data[category].filter(b => b.id !== id);
  writeJson(KEY_BOOKMARKS, data);
  return data[category].length !== before;
}

// ===== Memory Items (IndexedDB) =====
// Store unified manual items: { id, type, content, created_at }
const DB_NAME = 'floOS_db';
const STORE_MEMORY = 'memory_items_v1';
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_MEMORY)) {
        db.createObjectStore(STORE_MEMORY, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function saveMemoryItem(item) {
  const db = await openDb();
  const tx = db.transaction(STORE_MEMORY, 'readwrite');
  const store = tx.objectStore(STORE_MEMORY);
  const record = {
    id: crypto.randomUUID(),
    type: item.type,
    content: item.content,
    created_at: item.created_at || Date.now(),
  };
  await new Promise((resolve, reject) => {
    const req = store.add(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return record;
}

export async function getAllMemoryItems() {
  const db = await openDb();
  const tx = db.transaction(STORE_MEMORY, 'readonly');
  const store = tx.objectStore(STORE_MEMORY);
  const items = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return items;
}
