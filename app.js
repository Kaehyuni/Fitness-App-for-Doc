const STORAGE_KEY = "fitness_tracker_users_v2";
const SESSION_KEY = "fitness_tracker_session_v2";

let timerInterval = null;
let timerSeconds = 0;
let selectedWorkoutMode = "Gym Workout";
let selectedGoal = "Strength";
let selectedPlanType = "Build Routine";
let pendingWorkout = null;
let pendingPlan = [];

const defaultPlans = {
  Strength: [
    { name: "Push Ups", sets: "3", value: "10", type: "reps" },
    { name: "Lat Pulldown", sets: "3", value: "8", type: "reps" },
    { name: "Bent Over Row", sets: "3", value: "10", type: "reps" },
    { name: "Plank", sets: "3", value: "30s", type: "time" }
  ],
  Endurance: [
    { name: "Jump Rope", sets: "3", value: "60s", type: "time" },
    { name: "Mountain Climbers", sets: "3", value: "20", type: "reps" },
    { name: "Jogging", sets: "1", value: "15 min", type: "time" },
    { name: "Plank", sets: "2", value: "30s", type: "time" }
  ],
  "General Fitness": [
    { name: "Push Ups", sets: "2", value: "8", type: "reps" },
    { name: "Squats", sets: "3", value: "12", type: "reps" },
    { name: "Lat Pulldown", sets: "2", value: "8", type: "reps" },
    { name: "Plank", sets: "2", value: "20s", type: "time" }
  ]
};

function getUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function getCurrentSession() {
  return localStorage.getItem(SESSION_KEY);
}

function setCurrentSession(email) {
  localStorage.setItem(SESSION_KEY, email);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getCurrentUser() {
  const email = getCurrentSession();
  if (!email) return null;
  return getUsers().find(user => user.email === email) || null;
}

function updateCurrentUser(updatedUser) {
  const users = getUsers().map(user =>
    user.email === updatedUser.email ? updatedUser : user
  );
  saveUsers(users);
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });
  document.getElementById(screenId).classList.add("active");
}

function goHome() {
  renderHome();
  showScreen("home-screen");
}

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    button.textContent = "🙈";
  } else {
    input.type = "password";
    button.textContent = "👁";
  }
}

function signUp() {
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim().toLowerCase();
  const password = document.getElementById("signup-password").value.trim();

  if (!name || !email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  const users = getUsers();
  const exists = users.some(user => user.email === email);

  if (exists) {
    alert("That account already exists. Please sign in.");
    return;
  }

  const newUser = {
    name,
    email,
    password,
    workouts: [],
    savedPlans: []
  };

  users.push(newUser);
  saveUsers(users);

  alert("Account created. Now sign in.");
  document.getElementById("signup-name").value = "";
  document.getElementById("signup-email").value = "";
  document.getElementById("signup-password").value = "";
  showScreen("signin-screen");
}

function signIn() {
  const email = document.getElementById("signin-email").value.trim().toLowerCase();
  const password = document.getElementById("signin-password").value.trim();

  if (!email || !password) {
    alert("Please enter your email and password.");
    return;
  }

  const users = getUsers();

  if (!users.length) {
    alert("You must sign up first before signing in.");
    showScreen("signup-screen");
    return;
  }

  const found = users.find(user => user.email === email && user.password === password);

  if (!found) {
    const emailExists = users.some(user => user.email === email);
    if (!emailExists) {
      alert("No account found. Please sign up first.");
      showScreen("signup-screen");
      return;
    }
    alert("Incorrect password.");
    return;
  }

  setCurrentSession(found.email);
  document.getElementById("signin-email").value = "";
  document.getElementById("signin-password").value = "";
  renderHome();
  showScreen("home-screen");
}

function computeStreak(workouts) {
  if (!workouts.length) return 0;

  const uniqueDates = [...new Set(workouts.map(w => {
    const d = new Date(w.savedAt);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }))].sort((a, b) => b - a);

  let streak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = (uniqueDates[i - 1] - uniqueDates[i]) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function renderHome() {
  const user = getCurrentUser();
  if (!user) {
    showScreen("signin-screen");
    return;
  }

  document.getElementById("home-username").textContent = user.name;
  document.getElementById("home-streak").textContent = computeStreak(user.workouts);
}

function setPlanType(type) {
  selectedPlanType = type;
}

function chooseGoal(goal) {
  selectedGoal = goal;

  document.querySelectorAll(".goal-card").forEach(card => {
    card.classList.remove("selected");
    const check = card.querySelector(".goal-check");
    if (check) check.remove();
  });

  const map = {
    "Strength": "goal-strength",
    "Endurance": "goal-endurance",
    "General Fitness": "goal-general"
  };

  const selectedCard = document.getElementById(map[goal]);
  selectedCard.classList.add("selected");

  const check = document.createElement("div");
  check.className = "goal-check";
  check.textContent = "✓";
  selectedCard.appendChild(check);
}

function generatePlan() {
  pendingPlan = [...defaultPlans[selectedGoal]];
  document.getElementById("plan-goal-label").textContent = selectedGoal;
  document.getElementById("plan-count").textContent = pendingPlan.length;

  const list = document.getElementById("plan-preview-list");
  list.innerHTML = "";

  pendingPlan.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "plan-preview-item";
    div.innerHTML = `
      <div class="plan-name">${index + 1}. ${item.name}</div>
      <div class="plan-value">${item.sets} x ${item.value}</div>
    `;
    list.appendChild(div);
  });

  showScreen("plan-preview-screen");
}

function quickPlan() {
  pendingPlan = [...defaultPlans["General Fitness"]];
  selectedGoal = "General Fitness";
  generatePlan();
}

function savePlan() {
  const user = getCurrentUser();
  if (!user) return;

  user.savedPlans.unshift({
    goal: selectedGoal,
    items: pendingPlan,
    savedAt: new Date().toISOString()
  });

  updateCurrentUser(user);
  alert("Plan saved.");
  goHome();
}

function selectWorkoutMode(mode) {
  selectedWorkoutMode = mode;
}

function continueLastWorkout() {
  const user = getCurrentUser();
  if (!user) return;

  if (!user.workouts.length) {
    alert("No last workout found. Starting a new workout.");
    startNewWorkout();
    return;
  }

  const last = user.workouts[0];
  document.getElementById("continue-date").textContent = formatDate(new Date(last.savedAt));

  const list = document.getElementById("continue-list");
  list.innerHTML = "";

  last.exercises.forEach(ex => {
    const div = document.createElement("div");
    div.className = "last-workout-item";
    div.innerHTML = `
      <div class="last-title">${ex.name}</div>
      <div class="last-value">${ex.sets} x ${ex.value}</div>
    `;
    list.appendChild(div);
  });

  pendingWorkout = JSON.parse(JSON.stringify(last));
  showScreen("continue-screen");
}

function startNewWorkout() {
  pendingWorkout = {
    mode: selectedWorkoutMode,
    notes: "",
    exercises: [
      { name: "Push Ups", sets: "3", value: "10", type: "reps" },
      { name: "Lat Pulldown", sets: "3", value: "8", type: "reps" },
      { name: "Plank", sets: "3", value: "30s", type: "time" }
    ],
    savedAt: new Date().toISOString()
  };

  renderWorkoutScreen();
  showScreen("workout-screen");
  startTimer();
}

function loadIntoWorkout() {
  if (!pendingWorkout) {
    startNewWorkout();
    return;
  }

  renderWorkoutScreen();
  showScreen("workout-screen");
  startTimer();
}

function renderWorkoutScreen() {
  const list = document.getElementById("exercise-list");
  list.innerHTML = "";

  pendingWorkout.exercises.forEach((exercise, index) => {
    const div = document.createElement("div");
    div.className = "exercise-card";
    div.innerHTML = `
      <div class="exercise-card-title-row">
        <div class="exercise-title">${exercise.name}</div>
        <button class="more-btn" type="button">⋮</button>
      </div>
      <div class="set-rep-grid">
        <div class="small-input-group">
          <label class="small-label">Sets</label>
          <input class="input" value="${exercise.sets}" onchange="updateExercise(${index}, 'sets', this.value)" />
        </div>
        <div class="small-input-group">
          <label class="small-label">${exercise.type === "time" ? "Time" : "Reps"}</label>
          <input class="input" value="${exercise.value}" onchange="updateExercise(${index}, 'value', this.value)" />
        </div>
      </div>
    `;
    list.appendChild(div);
  });

  document.getElementById("workout-notes").value = pendingWorkout.notes || "";
}

function updateExercise(index, field, value) {
  pendingWorkout.exercises[index][field] = value;
}

function addExercise() {
  if (!pendingWorkout) return;

  pendingWorkout.exercises.push({
    name: `Exercise ${pendingWorkout.exercises.length + 1}`,
    sets: "3",
    value: "10",
    type: "reps"
  });

  renderWorkoutScreen();
}

function startTimer() {
  clearInterval(timerInterval);
  timerSeconds = 0;
  updateTimerText();

  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerText();
  }, 1000);
}

function updateTimerText() {
  const mins = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const secs = String(timerSeconds % 60).padStart(2, "0");
  document.getElementById("timer-text").textContent = `${mins}:${secs}`;
}

function endWorkout() {
  if (!pendingWorkout) return;

  clearInterval(timerInterval);
  pendingWorkout.notes = document.getElementById("workout-notes").value.trim();
  pendingWorkout.savedAt = new Date().toISOString();
  pendingWorkout.duration = timerSeconds;

  const summary = document.getElementById("summary-performance");
  summary.innerHTML = "";

  pendingWorkout.exercises.forEach(ex => {
    const row = document.createElement("div");
    row.className = "performance-row";
    row.innerHTML = `
      <span>${ex.name}</span>
      <span class="performance-plus">+${ex.value}</span>
    `;
    summary.appendChild(row);
  });

  const user = getCurrentUser();
  document.getElementById("summary-streak").textContent = computeStreak([
    { savedAt: new Date().toISOString() },
    ...user.workouts
  ]);

  showScreen("summary-screen");
}

function saveWorkout() {
  const user = getCurrentUser();
  if (!user || !pendingWorkout) return;

  user.workouts.unshift(JSON.parse(JSON.stringify(pendingWorkout)));
  updateCurrentUser(user);

  alert("Workout saved.");
  pendingWorkout = null;
  renderHome();
  renderProgress();
  goHome();
}

function renderProgress() {
  const user = getCurrentUser();
  if (!user) return;

  document.getElementById("progress-streak").textContent = computeStreak(user.workouts);
  document.getElementById("progress-workouts").textContent = user.workouts.length;
}

function renderTimeline() {
  const user = getCurrentUser();
  if (!user) return;

  const list = document.getElementById("timeline-list");
  list.innerHTML = "";

  if (!user.workouts.length) {
    list.innerHTML = `<div class="timeline-item"><div class="timeline-left"><strong>No workouts yet</strong></div><div></div></div>`;
    return;
  }

  user.workouts.slice(0, 4).forEach(workout => {
    const div = document.createElement("div");
    div.className = "timeline-item";
    div.innerHTML = `
      <div class="timeline-left">
        <strong>${formatDate(new Date(workout.savedAt))}</strong>
        <div class="milestone-sub">${workout.mode}</div>
      </div>
      <div class="timeline-check">✓</div>
    `;
    list.appendChild(div);
  });
}

function renderStreak() {
  const user = getCurrentUser();
  if (!user) return;

  document.getElementById("streak-big-number").textContent = computeStreak(user.workouts);
}

function renderMilestones() {
  const user = getCurrentUser();
  if (!user) return;

  const list = document.getElementById("milestones-list");
  list.innerHTML = "";

  const milestones = [];

  if (user.workouts.length) {
    milestones.push({
      icon: "💪",
      title: "+5 lbs",
      sub: "Lat Pulldown"
    });
    milestones.push({
      icon: "💪",
      title: "+2 Reps",
      sub: "Push Ups"
    });
    milestones.push({
      icon: "⏱",
      title: "+10s",
      sub: "Plank"
    });
  }

  if (!milestones.length) {
    list.innerHTML = `
      <div class="milestone-item">
        <div class="milestone-left">
          <div class="milestone-icon">🏆</div>
          <div>
            <div class="milestone-title">No milestones yet</div>
            <div class="milestone-sub">Save a workout to see progress</div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  milestones.forEach(item => {
    const div = document.createElement("div");
    div.className = "milestone-item";
    div.innerHTML = `
      <div class="milestone-left">
        <div class="milestone-icon">${item.icon}</div>
        <div>
          <div class="milestone-title">${item.title}</div>
          <div class="milestone-sub">${item.sub}</div>
        </div>
      </div>
    `;
    list.appendChild(div);
  });
}

window.onload = function () {
  const user = getCurrentUser();
  if (user) {
    renderHome();
    renderProgress();
    showScreen("home-screen");
  } else {
    showScreen("signin-screen");
  }
};
