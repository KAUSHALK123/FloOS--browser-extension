// ===== Calendar Data Model v1 =====

const STORAGE_KEY = "floOS_calendar_v1";

export function loadCalendarData() {
  let raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const legacy = localStorage.getItem("orbit_calendar_v1");
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, legacy);
      raw = legacy;
    }
  }
  if (!raw) {
    return {
      version: 1,
      tasksByDate: {}
    };
  }
  return JSON.parse(raw);
}

export function saveCalendarData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function addTask(task) {
  const data = loadCalendarData();
  const dateKey = task.date;

  if (!data.tasksByDate[dateKey]) {
    data.tasksByDate[dateKey] = [];
  }

  data.tasksByDate[dateKey].push(task);
  saveCalendarData(data);
}

export function getTasksByDate(dateKey) {
  const data = loadCalendarData();
  return data.tasksByDate[dateKey] || [];
}

function generateUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}

// New API expected by app.js
export function saveTask(dateKey, task) {
  const data = loadCalendarData();
  if (!data.tasksByDate[dateKey]) {
    data.tasksByDate[dateKey] = [];
  }
  const toSave = {
    id: generateUUID(),
    subject: task.subject || "",
    description: task.description || "",
    link: task.link || "",
    createdAt: task.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  data.tasksByDate[dateKey].push(toSave);
  saveCalendarData(data);
}

export function getTasks(dateKey) {
  return getTasksByDate(dateKey);
}