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
  const createdAt = task.createdAt || Date.now();
  const toSave = {
    id: crypto.randomUUID(),
    subject: task.subject || "",
    description: task.description || "",
    link: task.link || "",
    createdAt,
    // Lower order appears first. Default keeps newest tasks near the top.
    order: typeof task.order === "number" ? task.order : -createdAt,
    updatedAt: Date.now(),
  };
  data[dateKey].push(toSave);
  writeJson(KEY_TASKS, data);
  return toSave;
}

export function deleteTask(dateKey, taskId) {
  const data = readJson(KEY_TASKS, {});
  if (!data[dateKey]) return false;
  const before = data[dateKey].length;
  data[dateKey] = data[dateKey].filter(t => t.id !== taskId);
  if (data[dateKey].length === 0) {
    delete data[dateKey];
  }
  writeJson(KEY_TASKS, data);
  return data[dateKey]?.length !== before || before > 0;
}

export function updateTask(dateKey, taskId, updates) {
  const data = readJson(KEY_TASKS, {});
  const list = data[dateKey];
  if (!list) return false;

  const task = list.find(t => t.id === taskId);
  if (!task) return false;

  if (typeof updates.subject === 'string') task.subject = updates.subject;
  if (typeof updates.description === 'string') task.description = updates.description;
  if (typeof updates.link === 'string') task.link = updates.link;
  task.updatedAt = Date.now();

  writeJson(KEY_TASKS, data);
  return task;
}

export function reorderTasks(orderEntries) {
  const data = readJson(KEY_TASKS, {});
  let changed = false;

  orderEntries.forEach((entry, index) => {
    const list = data[entry.dateKey] || [];
    const task = list.find(t => t.id === entry.id);
    if (!task) return;

    if (task.order !== index) {
      task.order = index;
      task.updatedAt = Date.now();
      changed = true;
    }
  });

  if (changed) {
    writeJson(KEY_TASKS, data);
  }

  return changed;
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

// ===== Notes Storage =====
const KEY_NOTES = "floOS_notes_v1";

const DEFAULT_NOTES = [
  {
    id: "note-movies",
    title: "Movies to be watched",
    content: "Dune 2\nOppenheimer\nMatrix 4\nAlien: Romulus"
  },
  {
    id: "note-buy",
    title: "To Buy List",
    content: "New Keyboard\nM2 Macbook Case\nEspresso Machine\nCoffee Beans"
  },
  {
    id: "note-project",
    title: "Major Project Specs",
    content: "-Finalize UX flow\n-API integration\n-Deployment plan\n-Siva check-in"
  },
  {
    id: "note-thoughts",
    title: "Random Thoughts",
    content: "Start a blog\nVacation in Japan\nLearn Python faster\nCall Mom"
  }
];

export function getNotes() {
  const notes = readJson(KEY_NOTES, null);
  if (notes === null) {
    writeJson(KEY_NOTES, DEFAULT_NOTES);
    return DEFAULT_NOTES;
  }
  return notes;
}

export function saveNote(id, title, content) {
  const notes = getNotes();
  const index = notes.findIndex(n => n.id === id);
  if (index !== -1) {
    notes[index].title = title;
    notes[index].content = content;
    notes[index].updatedAt = Date.now();
  } else {
    notes.push({
      id: id || crypto.randomUUID(),
      title,
      content,
      updatedAt: Date.now()
    });
  }
  writeJson(KEY_NOTES, notes);
}

export function deleteNote(id) {
  let notes = getNotes();
  notes = notes.filter(n => n.id !== id);
  writeJson(KEY_NOTES, notes);
}

export function createNote(title = "New Note", content = "") {
  const note = {
    id: crypto.randomUUID(),
    title,
    content,
    updatedAt: Date.now()
  };
  const notes = getNotes();
  notes.push(note);
  writeJson(KEY_NOTES, notes);
  return note;
}

