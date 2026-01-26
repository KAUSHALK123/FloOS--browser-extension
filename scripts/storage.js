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
