// ===== Calendar Data Model v1 =====

const STORAGE_KEY = "orbit_calendar_v1";

export function loadCalendarData() {
  const raw = localStorage.getItem(STORAGE_KEY);
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

//b2 