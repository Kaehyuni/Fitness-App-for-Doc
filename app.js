let currentUser = null;

function goTo(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function signUp() {
  const name = document.getElementById("signupName").value;
  const email = document.getElementById("signupEmail").value;
  const pass = document.getElementById("signupPass").value;

  if (!name || !email || !pass) {
    alert("Fill all fields");
    return;
  }

  localStorage.setItem("user", JSON.stringify({ name, email, pass }));
  alert("Account created!");
  goTo("signin");
}

function signIn() {
  const email = document.getElementById("loginEmail").value;
  const pass = document.getElementById("loginPass").value;

  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    alert("You must sign up first!");
    return;
  }

  if (email === user.email && pass === user.pass) {
    currentUser = user;
    document.getElementById("welcome").innerText = `Hi, ${user.name}`;
    goTo("home");
  } else {
    alert("Wrong login");
  }
}

function startWorkout(type) {
  document.getElementById("workoutType").innerText = type + " Workout";
  goTo("workout");
}

function finishWorkout() {
  const pushups = document.getElementById("pushups").value || 0;
  const plank = document.getElementById("plank").value || 0;

  const data = {
    pushups,
    plank,
    date: new Date().toLocaleDateString()
  };

  localStorage.setItem("lastWorkout", JSON.stringify(data));

  document.getElementById("summaryText").innerText =
    `Pushups: ${pushups}, Plank: ${plank}s`;

  goTo("summary");
}

function selectGoal(goal) {
  let plan = "";

  if (goal === "Strength") {
    plan = "Pushups, Pullups, Bench";
  } else if (goal === "Endurance") {
    plan = "Running, Cycling, Plank";
  } else {
    plan = "Full Body Routine";
  }

  document.getElementById("planText").innerText = plan;
  goTo("planPreview");
}

function loadProgress() {
  const workout = JSON.parse(localStorage.getItem("lastWorkout"));

  if (!workout) {
    document.getElementById("progressText").innerText = "No data yet";
    return;
  }

  document.getElementById("progressText").innerText =
    `Last workout: ${workout.date}`;
  document.getElementById("timelineText").innerText =
    `Workout on ${workout.date}`;
  document.getElementById("streakText").innerText = "3 Day Streak 🔥";
  document.getElementById("milestoneText").innerText =
    "+2 reps Pushups, +10s Plank";
}

loadProgress();
