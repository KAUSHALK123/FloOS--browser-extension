import { saveTask, getTasks } from "./calendarData.js";
// Calendar data helpers inlined to avoid ES module loading issues
const STORAGE_KEY = "floOS_calendar_v1";

function loadCalendarData() {
  let raw = localStorage.getItem(STORAGE_KEY);
  // migrate from legacy key if present
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

function saveCalendarData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function addTask(task) {
  const data = loadCalendarData();
  const dateKey = task.date;

  if (!data.tasksByDate[dateKey]) {
    data.tasksByDate[dateKey] = [];
  }

  data.tasksByDate[dateKey].push(task);
  saveCalendarData(data);
}

function getTasksByDate(dateKey) {
  const data = loadCalendarData();
  return data.tasksByDate[dateKey] || [];
}

const modal = document.getElementById("calendarModal");
const modalTitle = document.getElementById("modalDateTitle");
const subjectInput = document.getElementById("taskSubject");
const descInput = document.getElementById("taskDescription");
const linkInput = document.getElementById("taskLink");
const taskList = document.getElementById("taskList");

const apps = {
  social: [
    { icon: "instagram", url: "https://instagram.com" },
    { icon: "github", url: "https://github.com" }
  ],
  work: [
    { icon: "mail", url: "https://mail.google.com" },
    { icon: "settings", url: "chrome://settings" }
  ]
};

const dialIcons = ["mail", "music", "settings", "user", "camera", "layers"];
const stepAngle = 360 / dialIcons.length;


let activeDate = null;
let rotationOffset = 0;
let dialItemEls = [];

/* OPEN MODAL */
function openTaskModal(dateKey) {
  activeDate = dateKey;
  modalLabel.textContent = `Task for ${dateKey}`;
  titleInput.value = "";
  timeInput.value = "";
  descInput.value = "";
  linkInput.value = "";
  modal.classList.remove("hidden");
}
function initDial() {
  dialItemEls = [];
  const orbit = document.getElementById("orbitItems");
  orbit.innerHTML = "";

  dialIcons.forEach((icon, i) => {
    const angle = i * stepAngle;
    const div = document.createElement("div");
    div.className = "dial-item";
    div.dataset.angle = angle;
    div.style.transform = `rotate(${angle}deg) translate(180px) rotate(${-angle}deg)`;
    div.innerHTML = `<img src="assets/icons/${icon}.svg" />`;
    orbit.appendChild(div);
    dialItemEls.push(div);
  });
}

function applyDialRotation() {
  for (let i = 0; i < dialItemEls.length; i++) {
    const base = i * stepAngle + rotationOffset;
    const el = dialItemEls[i];
    el.style.transform = `rotate(${base}deg) translate(180px) rotate(${-base}deg)`;
  }
}

/* CLOSE MODAL */
// Old modal handlers removed; new handlers added at bottom of file
let currentMonth = new Date().getMonth(); // 0-11
let currentYear = new Date().getFullYear();
let selectedDate = null;

function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

//

//moth navigation
function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  const label = document.getElementById("monthLabel");

  grid.innerHTML = "";

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = daysInMonth(currentYear, currentMonth);

  label.textContent = `${new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" })} ${currentYear}`;

  const table = document.createElement("table");
  table.className = "calendar-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  days.forEach(d => {
    const th = document.createElement("th");
    th.textContent = d;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  let dayNum = 1;
  for (let week = 0; week < 6; week++) {
    const tr = document.createElement("tr");
    for (let dow = 0; dow < 7; dow++) {
      const td = document.createElement("td");
      // Fill leading blanks in first week
      if (week === 0 && dow < firstDay) {
        td.className = "empty";
        tr.appendChild(td);
        continue;
      }

      if (dayNum > totalDays) {
        td.className = "empty";
        tr.appendChild(td);
        continue;
      }

      const dateKey = formatDateKey(currentYear, currentMonth, dayNum);
      td.dataset.date = dateKey;
      td.textContent = String(dayNum);

      if (getTasks(dateKey).length > 0) {
        td.classList.add("has-task");
      }

      if (selectedDate === dateKey) {
        td.classList.add("selected");
      }

      td.addEventListener("click", () => {
        activeDate = dateKey;
        modalTitle.textContent = `Task for ${dateKey}`;
        subjectInput.value = "";
        descInput.value = "";
        linkInput.value = "";
        modal.classList.remove("hidden");
        renderTaskList(dateKey);
      });

      tr.appendChild(td);
      dayNum++;
    }
    tbody.appendChild(tr);
    if (dayNum > totalDays) break;
  }

  table.appendChild(tbody);
  grid.appendChild(table);
}


//c5 
document.getElementById("prevMonth").onclick = () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
};

document.getElementById("nextMonth").onclick = () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
};


//c6 
function openTaskPrompt(dateKey) {
  const title = prompt(`Task title for ${dateKey}`);
  if (!title) return;

  const time = prompt("Time (HH:mm)", "12:00");
  const description = prompt("Description");
  const link = prompt("Link (optional)");

  addTask({
    id: crypto.randomUUID(),
    date: dateKey,
    time,
    title,
    description,
    link,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  renderCalendar();
}
function renderTaskList(dateKey) {
  taskList.innerHTML = "";
  const tasks = getTasks(dateKey);

  tasks.forEach(task => {
    const div = document.createElement("div");
    div.className = "task-item";
    div.innerHTML = `
      <span>${task.subject || ""}</span>
      <button onclick="window.open('${task.link || "#"}')">↗</button>
    `;
    taskList.appendChild(div);
  });
}


// Initialize after DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  initDial();
  renderCalendar();
  console.log("floOS: app.js initialized");

  const dial = document.getElementById("mainDial");
  dial.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      rotationOffset += delta * 15; // step angle
      applyDialRotation();
    },
    { passive: false }
  );

  // STEP 5 — SAVE & CLOSE LOGIC
  document.getElementById("cancelModal").onclick = () => {
    modal.classList.add("hidden");
  };

  document.getElementById("saveModal").onclick = () => {
    if (!subjectInput.value.trim()) return;

    saveTask(activeDate, {
      subject: subjectInput.value,
      description: descInput.value,
      link: linkInput.value,
      createdAt: Date.now()
    });

    modal.classList.add("hidden");
    renderCalendar();
    renderTaskList(activeDate);
  };

  const addBtn = document.getElementById("addTaskBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const now = new Date();
      const todayKey = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
      activeDate = selectedDate || todayKey;
      modalTitle.textContent = `Task for ${activeDate}`;
      subjectInput.value = "";
      descInput.value = "";
      linkInput.value = "";
      modal.classList.remove("hidden");
      renderTaskList(activeDate);
    });
  }

  // Live internet time setup
  setupInternetClock();
});

// ===== Internet-synced clock =====
let internetOffsetMs = 0; // delta to correct local time
let clockIntervalId = null;
let resyncIntervalId = null;

function formatClock(date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatDateLabel(date) {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const m = months[date.getMonth()];
  const d = String(date.getDate()).padStart(2, "0");
  const dow = days[date.getDay()];
  return `${m} ${d} ${dow}`;
}

function updateClock() {
  const now = new Date(Date.now() + internetOffsetMs);
  const timeEl = document.getElementById("time");
  const dateEl = document.getElementById("date");
  if (timeEl) timeEl.textContent = formatClock(now);
  if (dateEl) dateEl.textContent = formatDateLabel(now);
}

async function syncInternetTime() {
  try {
    const resp = await fetch("https://worldtimeapi.org/api/ip", { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const serverIso = data.datetime; // ISO string
    const serverMs = Date.parse(serverIso);
    const localMs = Date.now();
    internetOffsetMs = serverMs - localMs;
    updateClock();
    console.log("floOS: time synced from internet");
  } catch (e) {
    console.warn("floOS: internet time sync failed, using local clock", e);
    internetOffsetMs = 0;
    updateClock();
  }
}

function setupInternetClock() {
  // initial sync and start ticking
  syncInternetTime();
  if (clockIntervalId) clearInterval(clockIntervalId);
  clockIntervalId = setInterval(updateClock, 1000);
  // periodic resync (every 5 minutes)
  if (resyncIntervalId) clearInterval(resyncIntervalId);
  resyncIntervalId = setInterval(syncInternetTime, 5 * 60 * 1000);
}
