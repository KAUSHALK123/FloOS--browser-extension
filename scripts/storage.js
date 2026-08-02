// Unified storage for floOS: tasks and bookmarks (localStorage-backed)
const KEY_TASKS = "floOS_tasks_v1";
const KEY_BOOKMARKS = "floOS_bookmarks_v1";

export function generateUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}

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
    id: generateUUID(),
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
    id: generateUUID(),
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
    id: generateUUID(),
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
      id: id || generateUUID(),
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
    id: generateUUID(),
    title,
    content,
    updatedAt: Date.now()
  };
  const notes = getNotes();
  notes.push(note);
  writeJson(KEY_NOTES, notes);
  return note;
}

// ===== Vault Crypto & Storage =====
const KEY_VAULT = "floOS_vault_v1";
const enc = new TextEncoder();
const dec = new TextDecoder();

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex) {
  const view = new Uint8Array(hex.length / 2);
  for (let i = 0; i < view.length; i++) {
    view[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return view;
}

async function getEncryptionKey(password, salt) {
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(plaintext, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await getEncryptionKey(password, salt);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    enc.encode(plaintext)
  );
  return `${bufToHex(salt)}:${bufToHex(iv)}:${bufToHex(new Uint8Array(encrypted))}`;
}

export async function decryptData(encryptedStr, password) {
  const parts = encryptedStr.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");
  const salt = hexToBuf(parts[0]);
  const iv = hexToBuf(parts[1]);
  const ciphertext = hexToBuf(parts[2]);
  const key = await getEncryptionKey(password, salt);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    ciphertext
  );
  return dec.decode(decrypted);
}

// Vault CRUD
export function isVaultInitialized() {
  return localStorage.getItem(KEY_VAULT) !== null;
}

export async function initializeVault(password) {
  const emptyVault = [];
  const ciphertext = await encryptData(JSON.stringify(emptyVault), password);
  localStorage.setItem(KEY_VAULT, ciphertext);
  return emptyVault;
}

export async function getVaultSecrets(password) {
  const ciphertext = localStorage.getItem(KEY_VAULT);
  if (!ciphertext) return null;
  const decryptedStr = await decryptData(ciphertext, password);
  return JSON.parse(decryptedStr);
}

export async function saveVaultSecret(password, secretItem) {
  const secrets = await getVaultSecrets(password);
  if (!secrets) throw new Error("Vault not unlocked or wrong password");
  
  const index = secrets.findIndex(s => s.id === secretItem.id);
  if (index !== -1) {
    secrets[index] = { ...secrets[index], ...secretItem, updatedAt: Date.now() };
  } else {
    secrets.push({
      id: generateUUID(),
      title: secretItem.title,
      username: secretItem.username || "",
      value: secretItem.value,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  
  const newCiphertext = await encryptData(JSON.stringify(secrets), password);
  localStorage.setItem(KEY_VAULT, newCiphertext);
  return secrets;
}

export async function deleteVaultSecret(password, secretId) {
  const secrets = await getVaultSecrets(password);
  if (!secrets) throw new Error("Vault not unlocked or wrong password");
  
  const filtered = secrets.filter(s => s.id !== secretId);
  const newCiphertext = await encryptData(JSON.stringify(filtered), password);
  localStorage.setItem(KEY_VAULT, newCiphertext);
  return filtered;
}

