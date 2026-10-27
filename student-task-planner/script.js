
const taskForm = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const subjectInput = document.getElementById("task-subject");
const deadlineInput = document.getElementById("task-deadline");
const priorityInput = document.getElementById("task-priority");
const taskList = document.getElementById("task-list");

const totalCount = document.getElementById("total-count");
const pendingCount = document.getElementById("pending-count");
const completedCount = document.getElementById("completed-count");
const streakCount = document.getElementById("streak-count");
const visibleCount = document.getElementById("visible-count");

const focusContent = document.getElementById("focus-content");
const motivationMessage = document.getElementById("motivation-message");
const weekChart = document.getElementById("week-chart");
const weeklySummary = document.getElementById("weekly-summary");

const timerDisplay = document.getElementById("timer-display");
const timerStatus = document.getElementById("timer-status");
const timerStartButton = document.getElementById("timer-start");
const timerResetButton = document.getElementById("timer-reset");
const modeButtons = document.querySelectorAll(".mode-button");
const celebration = document.getElementById("celebration");

const TASKS_KEY = "studentPlannerTasks_v1";
const FOCUS_KEY = "studentPlannerFocus_v1";

let tasks = loadTasks();
let activeFilter = "all";
let celebrationTimeout;
let timerInterval = null;
let selectedMode = "Focus";
let timerSeconds = 25 * 60;

function loadTasks() {
  try {
    const savedTasks = JSON.parse(localStorage.getItem(TASKS_KEY));
    return Array.isArray(savedTasks) ? savedTasks : [];
  } catch (error) {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "";
  const parts = dateString.split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function showCelebration(message) {
  celebration.textContent = message;
  celebration.classList.add("show");
  clearTimeout(celebrationTimeout);
  celebrationTimeout = setTimeout(() => {
    celebration.classList.remove("show");
  }, 3200);
}

function getMotivationMessage() {
  const completed = tasks.filter(task => task.completed).length;
  const messages = [
    "You don't have to do everything. Just begin. ♡",
    "Small steps are still progress. Keep going. ✦",
    "A focused 20 minutes is better than waiting for the perfect mood.",
    "You are building consistency, one task at a time.",
    "Take a breath. Pick one thing. You've got this."
  ];

  if (tasks.length > 0 && completed === tasks.length) {
    return "You did it! Everything on your list is complete. Be proud of yourself. ♡";
  }
  if (completed > 0 && completed % 3 === 0) {
    return "Look at you making progress. Give yourself credit. ✦";
  }
  return messages[new Date().getDate() % messages.length];
}

// ---------- Task form ----------
taskForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    return;
  }

  const deadline = deadlineInput.value;
  if (deadline && deadline < getLocalDateKey()) {
    showCelebration("That deadline is in the past. Choose a future date or leave it blank.");
    deadlineInput.focus();
    return;
  }

  const task = {
    id: makeId(),
    title,
    subject: subjectInput.value.trim(),
    deadline,
    priority: priorityInput.value,
    completed: false,
    createdAt: getLocalDateKey(),
    completedAt: null
  };

  tasks.unshift(task);
  saveTasks();
  taskForm.reset();
  priorityInput.value = "medium";
  renderAll();
  titleInput.focus();
});

// ---------- Task list rendering ----------
function renderTasks() {
  taskList.replaceChildren();

  const visibleTasks = tasks.filter(task => {
    if (activeFilter === "pending") return !task.completed;
    if (activeFilter === "completed") return task.completed;
    return true;
  });

  visibleCount.textContent = `${visibleTasks.length} ${visibleTasks.length === 1 ? "task" : "tasks"}`;

  if (visibleTasks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = activeFilter === "completed"
      ? "No completed tasks yet. Your first win is waiting."
      : activeFilter === "pending"
        ? "You're all caught up. Enjoy the breathing room."
        : "Your list is clear. Add a task whenever you're ready.";
    taskList.appendChild(empty);
    return;
  }

  visibleTasks.forEach(task => {
    const item = document.createElement("article");
    item.className = "task-item";
    if (task.completed) item.classList.add("completed");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `Mark ${task.title} as completed`);
    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      task.completedAt = task.completed ? getLocalDateKey() : null;
      saveTasks();
      renderAll();

      if (task.completed) {
        showCelebration("Task complete! Every small win counts. ✨");
      }
    });

    const content = document.createElement("div");
    content.className = "task-content";

    const title = document.createElement("p");
    title.className = "task-title";
    title.textContent = task.title;

    const subtitle = document.createElement("p");
    subtitle.className = "task-subtitle";
    const subtitleParts = [];
    if (task.subject) subtitleParts.push(task.subject);
    if (task.deadline) subtitleParts.push(`Due ${formatDate(task.deadline)}`);
    subtitle.textContent = subtitleParts.join(" · ") || "No subject or deadline added";

    const badges = document.createElement("div");
    badges.className = "task-badges";

    const priorityBadge = document.createElement("span");
    const priority = ["low", "medium", "high"].includes(task.priority) ? task.priority : "medium";
    priorityBadge.className = `badge priority-${priority}`;
    priorityBadge.textContent = `${priority[0].toUpperCase()}${priority.slice(1)} priority`;
    badges.appendChild(priorityBadge);

    if (task.deadline) {
      const deadlineBadge = document.createElement("span");
      deadlineBadge.className = "badge deadline-badge";
      deadlineBadge.textContent = task.deadline < getLocalDateKey() && !task.completed
        ? "Overdue"
        : formatDate(task.deadline);
      badges.appendChild(deadlineBadge);
    }

    content.append(title, subtitle, badges);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const focusButton = document.createElement("button");
    focusButton.type = "button";
    focusButton.className = "small-button";
    focusButton.textContent = localStorage.getItem(FOCUS_KEY) === task.id
      ? "★ Focus"
      : "Make focus";
    focusButton.disabled = task.completed;
    focusButton.addEventListener("click", () => {
      localStorage.setItem(FOCUS_KEY, task.id);
      renderFocus();
      renderTasks();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "small-button delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${task.title}`);
    deleteButton.addEventListener("click", () => {
      tasks = tasks.filter(itemTask => itemTask.id !== task.id);
      if (localStorage.getItem(FOCUS_KEY) === task.id) {
        localStorage.removeItem(FOCUS_KEY);
      }
      saveTasks();
      renderAll();
    });

    actions.append(focusButton, deleteButton);
    item.append(checkbox, content, actions);
    taskList.appendChild(item);
  });
}

function renderFocus() {
  focusContent.replaceChildren();

  const focusId = localStorage.getItem(FOCUS_KEY);
  const focusTask = tasks.find(task => task.id === focusId);

  if (!focusTask || focusTask.completed) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = focusTask
      ? "Your focus task is complete! Choose another task if you'd like. ♡"
      : "Add a task, then select “Make focus” to place it here.";
    focusContent.appendChild(empty);
    return;
  }

  const card = document.createElement("div");
  card.className = "focus-task";

  const details = document.createElement("div");
  const title = document.createElement("p");
  title.className = "focus-task-title";
  title.textContent = focusTask.title;

  const meta = document.createElement("p");
  meta.className = "focus-task-meta";
  const info = [];
  if (focusTask.subject) info.push(focusTask.subject);
  if (focusTask.deadline) info.push(`Due ${formatDate(focusTask.deadline)}`);
  info.push(`${focusTask.priority || "medium"} priority`);
  meta.textContent = info.join(" · ");

  details.append(title, meta);

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "small-button";
  clearButton.textContent = "Clear focus";
  clearButton.addEventListener("click", () => {
    localStorage.removeItem(FOCUS_KEY);
    renderFocus();
    renderTasks();
  });

  card.append(details, clearButton);
  focusContent.appendChild(card);
}


function renderStats() {
  const completedTasks = tasks.filter(task => task.completed);
  totalCount.textContent = tasks.length;
  pendingCount.textContent = tasks.length - completedTasks.length;
  completedCount.textContent = completedTasks.length;
  motivationMessage.textContent = getMotivationMessage();

  const completedDates = new Set(
    completedTasks
      .map(task => task.completedAt)
      .filter(Boolean)
  );

  let streak = 0;
  const today = new Date();
  const todayKey = getLocalDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);

 
  let checkDate = new Date(today);
  if (!completedDates.has(todayKey) && completedDates.has(yesterdayKey)) {
    checkDate = yesterday;
  }

  while (completedDates.has(getLocalDateKey(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  streakCount.textContent = streak;

  renderWeeklyProgress();
}

function renderWeeklyProgress() {
  weekChart.replaceChildren();

  const today = new Date();
  const startOfWeek = new Date(today);
  const mondayOffset = (today.getDay() + 6) % 7;
  startOfWeek.setDate(today.getDate() - mondayOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const key = getLocalDateKey(date);
    const count = tasks.filter(task => task.completed && task.completedAt === key).length;
    days.push({
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      key,
      count,
      isToday: key === getLocalDateKey(today)
    });
  }

  const maxCount = Math.max(1, ...days.map(day => day.count));
  const weekTotal = days.reduce((sum, day) => sum + day.count, 0);
  weeklySummary.textContent = `${weekTotal} ${weekTotal === 1 ? "task" : "tasks"} completed`;

  days.forEach(day => {
    const column = document.createElement("div");
    column.className = "week-day";

    const count = document.createElement("span");
    count.className = "week-count";
    count.textContent = day.count;

    const track = document.createElement("div");
    track.className = "week-bar-track";

    const bar = document.createElement("div");
    bar.className = "week-bar";
    if (day.isToday) bar.classList.add("today");
    bar.style.height = `${day.count === 0 ? 3 : Math.max(8, (day.count / maxCount) * 92)}px`;
    track.appendChild(bar);

    const label = document.createElement("span");
    label.className = "week-label";
    if (day.isToday) label.classList.add("today-label");
    label.textContent = day.label;

    column.append(count, track, label);
    weekChart.appendChild(column);
  });
}

document.querySelectorAll(".filter-button").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter-button").forEach(filterButton => {
      filterButton.classList.toggle("active", filterButton === button);
    });
    renderTasks();
  });
});


function updateTimerDisplay() {
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  timerDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function chooseTimerMode(button) {
  stopTimer();
  selectedMode = button.dataset.mode;
  timerSeconds = Number(button.dataset.minutes) * 60;
  modeButtons.forEach(modeButton => {
    modeButton.classList.toggle("active", modeButton === button);
  });
  timerStartButton.textContent = "Start";
  timerStatus.textContent = selectedMode === "Focus" ? "Ready when you are." : "Take a gentle breather.";
  updateTimerDisplay();
}

modeButtons.forEach(button => {
  button.addEventListener("click", () => chooseTimerMode(button));
});

timerStartButton.addEventListener("click", () => {
  if (timerInterval !== null) {
    stopTimer();
    timerStartButton.textContent = "Resume";
    timerStatus.textContent = "Paused. Resume when you're ready.";
    return;
  }

  if (timerSeconds <= 0) {
    timerSeconds = selectedMode === "Focus" ? 25 * 60 : 5 * 60;
  }

  timerStartButton.textContent = "Pause";
  timerStatus.textContent = selectedMode === "Focus" ? "One thing at a time. You've got this." : "Rest your eyes and shoulders.";

  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();

    if (timerSeconds <= 0) {
      stopTimer();
      timerStartButton.textContent = "Start";
      timerStatus.textContent = `${selectedMode} session complete!`;
      showCelebration(selectedMode === "Focus"
        ? "Focus session complete! Time for a short break. ✨"
        : "Break complete. Ready for another focus session? ♡");
    }
  }, 1000);
});

timerResetButton.addEventListener("click", () => {
  stopTimer();
  timerSeconds = selectedMode === "Focus" ? 25 * 60 : 5 * 60;
  timerStartButton.textContent = "Start";
  timerStatus.textContent = "Timer reset. Ready when you are.";
  updateTimerDisplay();
});


function renderAll() {
  renderTasks();
  renderFocus();
  renderStats();
}

document.getElementById("today-date").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric"
}).toUpperCase();

updateTimerDisplay();
renderAll();
