import { addTask, getTasksByDate } from "./calendarData.js";

const modal = document.getElementById("taskModal");
const titleInput = document.getElementById("taskTitle");
const timeInput = document.getElementById("taskTime");
const descInput = document.getElementById("taskDesc");
const linkInput = document.getElementById("taskLink");
const modalLabel = document.getElementById("modalDateLabel");
const taskList = document.getElementById("taskList");

let activeDate = null;

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

/* CLOSE MODAL */
document.getElementById("cancelTask").onclick = () => {
  modal.classList.add("hidden");
};

/* SAVE TASK */
document.getElementById("saveTask").onclick = () => {
  if (!titleInput.value.trim()) return;

  addTask({
    id: crypto.randomUUID(),
    date: activeDate,
    time: timeInput.value,
    title: titleInput.value,
    description: descInput.value,
    link: linkInput.value,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  modal.classList.add("hidden");
  renderCalendar();
  renderTaskList(activeDate);
};
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
<div class="calendar glass-inner">
  <div class="calendar-header">
    <button id="prevMonth">◀</button>
    <span id="monthLabel"></span>
    <button id="nextMonth">▶</button>
  </div>
  <div class="calendar-grid" id="calendarGrid"></div>
</div>

//moth navigation
function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  const label = document.getElementById("monthLabel");

  grid.innerHTML = "";

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = daysInMonth(currentYear, currentMonth);

  label.textContent = `${new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" })} ${currentYear}`;

  // Empty leading cells
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("span");
    grid.appendChild(empty);
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    const cell = document.createElement("span");
    cell.textContent = day;
    cell.dataset.date = dateKey;

    if (getTasksByDate(dateKey).length > 0) {
      cell.classList.add("has-task");
    }

    cell.onclick = () => {
  openTaskModal(dateKey);
  renderTaskList(dateKey);
};

    grid.appendChild(cell);
  }
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
  const tasks = getTasksByDate(dateKey);

  tasks.forEach(task => {
    const div = document.createElement("div");
    div.className = "task-item";
    div.innerHTML = `
      <span>${task.time || ""} ${task.title}</span>
      <button onclick="window.open('${task.link || "#"}')">↗</button>
    `;
    taskList.appendChild(div);
  });
}


//c7
renderCalendar();
