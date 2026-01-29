import { saveTask, getTasks, getBookmarks, addBookmark, removeBookmark } from "./storage.js";
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

const stepAngle = 360 / 6; // 6 slots around the dial


let activeDate = null;
let activeCategory = "dial"; // 'dial' maps to 'home' bookmarks visually
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
// Local-only favicon resolver to avoid external requests on boot
function getFaviconUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname || "";
    // Map a couple of known hosts to bundled SVGs
    if (host.includes("instagram.com")) return "assets/icons/instagram.svg";
    if (host.includes("mail.google.com")) return "assets/icons/mail.svg";
    // No external fetch for others during boot
    return null;
  } catch {
    return null;
  }
}

function initDial() {
  dialItemEls = [];
  const orbit = document.getElementById("orbitItems");
  orbit.innerHTML = "";

  const cat = activeCategory === "dial" ? "home" : activeCategory;
  const items = getBookmarks(cat).slice(0, 6);
  const count = Math.max(items.length, 6);
  for (let i = 0; i < count; i++) {
    const angle = i * stepAngle;
    const div = document.createElement("div");
    div.className = "dial-item";
    div.dataset.angle = angle;
    div.style.transform = `rotate(${angle}deg) translate(180px) rotate(${-angle}deg)`;
    if (i < items.length) {
      const it = items[i];
      const favicon = getFaviconUrl(it.url);
      if (favicon) {
        div.innerHTML = `<img src="${favicon}" alt="">`;
      } else {
        const initial = (it.title || it.url || "?").trim()[0]?.toUpperCase() || "?";
        div.innerHTML = `<span style="font-size:16px;opacity:.85">${initial}</span>`;
      }
      div.title = it.title || it.url;
      div.addEventListener("click", () => window.open(it.url, "_blank"));
    } else {
      div.innerHTML = `<span style="font-size:18px;opacity:.6">+</span>`;
      div.title = "Add bookmark";
      div.addEventListener("click", () => openAddBookmarkPrompt(cat));
    }
    orbit.appendChild(div);
    dialItemEls.push(div);
  }
}

function applyDialRotation() {
  for (let i = 0; i < dialItemEls.length; i++) {
    const base = i * stepAngle + rotationOffset;
    const el = dialItemEls[i];
    el.style.transform = `rotate(${base}deg) translate(180px) rotate(${-base}deg)`;
  }
}

function openAddBookmarkPrompt(category) {
  const url = prompt("Bookmark URL (https://...)");
  if (!url) return;
  const title = prompt("Title (optional)", url) || url;
  addBookmark(category, { title, url });
  initDial();
  if (category === (activeCategory === "dial" ? "home" : activeCategory)) {
    renderMiniCard(category);
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
  const titleEl = document.getElementById("calendarTitle");

  grid.innerHTML = "";

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = daysInMonth(currentYear, currentMonth);

  label.textContent = `${new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" })} ${currentYear}`;
  // Title shows current date in long form
  const now = new Date(Date.now() + internetOffsetMs);
  const weekday = now.toLocaleString("default", { weekday: "long" });
  const monthName = new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" });
  if (titleEl) {
    titleEl.textContent = `${weekday}, ${String(now.getDate())} ${monthName}`;
  }

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

function renderMonthTasksView() {
  const tasksEl = document.getElementById("monthTasks");
  const monthBack = document.getElementById("monthLabelBack");
  if (!tasksEl || !monthBack) return;
  tasksEl.innerHTML = "";
  monthBack.textContent = `${new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" })} ${currentYear}`;

  const totalDays = daysInMonth(currentYear, currentMonth);
  let count = 0;
  for (let day = 1; day <= totalDays; day++) {
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    const list = getTasks(dateKey);
    if (!list.length) continue;
    // Sort by createdAt
    list.sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
    list.forEach(t => {
      const item = document.createElement("div");
      item.className = "month-task-item";
      const linkHtml = t.link ? `<button class="open" onclick="window.open('${t.link}')">Open</button>` : "";
      item.innerHTML = `
        <span class="date">${dateKey}</span>
        <div>
          <div class="title">${t.subject || "(no subject)"}</div>
          <div class="desc">${t.description || ""}</div>
        </div>
        ${linkHtml}
      `;
      tasksEl.appendChild(item);
      count++;
    });
  }
  if (count === 0) {
    const empty = document.createElement("div");
    empty.style.opacity = ".7";
    empty.style.fontSize = "12px";
    empty.textContent = "No tasks saved for this month.";
    tasksEl.appendChild(empty);
  }
}


//c5 
function goPrevMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
  const leftPanel = document.querySelector('.left-panel');
  if (leftPanel && leftPanel.classList.contains('flip')) renderMonthTasksView();
}
function goNextMonth() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
  const leftPanel = document.querySelector('.left-panel');
  if (leftPanel && leftPanel.classList.contains('flip')) renderMonthTasksView();
}
document.getElementById("prevMonth").onclick = goPrevMonth;
document.getElementById("nextMonth").onclick = goNextMonth;


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

function renderMiniCard(category) {
  const card = document.getElementById("miniCard");
  if (!card) return;
  card.classList.add("visible");
  const items = getBookmarks(category);
  card.innerHTML = "";
  const header = document.createElement('div');
  header.className = 'mini-header';
  header.innerHTML = `
    <strong style="opacity:.8;text-transform:uppercase;font-size:12px;">${category} bookmarks</strong>
    <div class="mini-actions">
      <button id="miniAdd">+ Add</button>
      <button id="miniClose">× Close</button>
    </div>
  `;
  card.appendChild(header);
  header.querySelector('#miniAdd').addEventListener('click', () => openAddBookmarkPrompt(category));
  header.querySelector('#miniClose').addEventListener('click', () => { card.classList.remove('visible'); card.innerHTML = ''; });

  items.forEach(b => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.gap = "8px";
    div.style.position = "relative";
    div.setAttribute('draggable', 'true');
    const fav = getFaviconUrl(b.url);
    div.innerHTML = `
      <img src="${fav}" alt="" style="width:20px;height:20px;border-radius:4px;"/>
      <a href="${b.url}" target="_blank" style="color:#fff;text-decoration:none;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${b.title}</a>
      <button data-id="${b.id}" title="Remove" style="position:absolute;right:0;background:none;border:1px solid var(--border);color:#fff;border-radius:8px;font-size:10px;padding:2px 6px;cursor:pointer;opacity:.7;">Del</button>
    `;
    const btn = div.querySelector("button");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      removeBookmark(category, b.id);
      renderMiniCard(category);
      initDial();
    });
    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/json', JSON.stringify({ id: b.id, title: b.title, url: b.url }));
    });
    card.appendChild(div);
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
    // Button removed from UI; ensure no action bound
    addBtn.remove();
  }

  // Drag-and-drop target on main dial to add bookmarks to Home
  if (dial) {
    dial.addEventListener('dragover', (e) => { e.preventDefault(); dial.classList.add('dragover'); });
    dial.addEventListener('dragleave', () => dial.classList.remove('dragover'));
    dial.addEventListener('drop', (e) => {
      e.preventDefault();
      dial.classList.remove('dragover');
      try {
        const payload = e.dataTransfer.getData('application/json');
        if (!payload) return;
        const { title, url } = JSON.parse(payload);
        addBookmark('home', { title, url });
        activeCategory = 'dial';
        initDial();
      } catch {}
    });
  }

    // Category nav handlers
    document.querySelectorAll('.category-nav .bubble').forEach(bub => {
      const cat = bub.getAttribute('data-cat');
      if (!cat) return;
      bub.addEventListener('click', () => {
        document.querySelectorAll('.category-nav .bubble').forEach(x => x.classList.remove('active'));
        bub.classList.add('active');
        const wasSocial = activeCategory === 'social';
        activeCategory = cat;
        initDial();
        const card = document.getElementById('miniCard');
        if (cat === 'social') {
          if (wasSocial && card && card.classList.contains('visible')) {
            card.classList.remove('visible');
            card.innerHTML = '';
          } else {
            renderMiniCard('social');
          }
        } else if (card) {
          card.classList.remove('visible');
          card.innerHTML = '';
        }
      });

      // Do not show miniCard by default to keep dial unobstructed
    });

    // Plus bubble opens add-bookmark prompt for current category
    const plus = document.querySelector('.category-nav .plus-btn');
    if (plus) {
      plus.addEventListener('click', () => {
        const mapped = activeCategory === 'dial' ? 'home' : activeCategory;
        openAddBookmarkPrompt(mapped);
      });
    }

    // Calendar wheel navigation
    const calBox = document.getElementById('calendarBox');
    if (calBox) {
      calBox.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = Math.sign(e.deltaY);
        if (delta > 0) goNextMonth(); else goPrevMonth();
      }, { passive: false });
    }

  // Single flip button next to clock; flips entire left panel
  const leftFlipBtn = document.getElementById('leftFlipToggle');
  const leftPanel = document.querySelector('.left-panel');
  if (leftFlipBtn && leftPanel) {
    leftFlipBtn.addEventListener('click', () => {
      if (!leftPanel.classList.contains('flip')) {
        renderMonthTasksView();
        leftPanel.classList.add('flip');
      } else {
        leftPanel.classList.remove('flip');
      }
    });
  }

  // Local clock on boot (no network calls)
  setupLocalClock();
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
  // Keep feature available but do not run on boot.
  // To enable later, call this manually from a user action.
  syncInternetTime();
  if (clockIntervalId) clearInterval(clockIntervalId);
  clockIntervalId = setInterval(updateClock, 1000);
  if (resyncIntervalId) clearInterval(resyncIntervalId);
  resyncIntervalId = setInterval(syncInternetTime, 5 * 60 * 1000);
}

function setupLocalClock() {
  // Use only local system time and avoid any network calls
  internetOffsetMs = 0;
  updateClock();
  if (clockIntervalId) clearInterval(clockIntervalId);
  clockIntervalId = setInterval(updateClock, 1000);
}
