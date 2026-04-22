import React, { useEffect, useMemo, useState } from "react";

/* ================= STORAGE ================= */
const STORAGE_KEYS = {
  users: "fit_notes_users_v1",
  session: "fit_notes_session_v1",
};

/* ================= DATA ================= */
const defaultExercisesByGoal = {
  Strength: [
    { name: "Push Ups", sets: "3", reps: "10" },
    { name: "Lat Pulldown", sets: "3", reps: "8" },
    { name: "Bent Over Row", sets: "3", reps: "10" },
    { name: "Plank", sets: "3", reps: "30s" },
  ],
  Endurance: [
    { name: "Jump Rope", sets: "3", reps: "60s" },
    { name: "Bodyweight Squats", sets: "3", reps: "15" },
    { name: "Mountain Climbers", sets: "3", reps: "20" },
    { name: "Jog / Walk", sets: "1", reps: "15 min" },
  ],
  "General Fitness": [
    { name: "Push Ups", sets: "2", reps: "8" },
    { name: "Squats", sets: "2", reps: "12" },
    { name: "Lat Pulldown", sets: "2", reps: "8" },
    { name: "Plank", sets: "2", reps: "20s" },
  ],
};

const quickPlans = [
  {
    label: "Quick Gym Plan",
    goal: "Strength",
    items: defaultExercisesByGoal.Strength,
  },
];

/* ================= HELPERS ================= */
function makeId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.users) || "[]");
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function getSession() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.session) || "null");
}

function setSession(session) {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

function todayLabel() {
  return new Date().toLocaleDateString();
}

function emptyWorkout() {
  return {
    id: makeId(),
    date: todayLabel(),
    exercises: [],
    notes: "",
  };
}

/* ================= COMPONENT ================= */
export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");

  const [workouts, setWorkouts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [currentWorkout, setCurrentWorkout] = useState(emptyWorkout());

  /* ================= AUTH ================= */
  const handleAuth = () => {
    const users = readUsers();

    if (!email || !password) {
      setError("Fill everything");
      return;
    }

    if (authMode === "signup") {
      const newUser = { email, password, fullName, workouts: [], plans: [] };
      saveUsers([...users, newUser]);
      setSession({ email });
      setUser(newUser);
      return;
    }

    const found = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!found) {
      setError("Wrong login");
      return;
    }

    setUser(found);
    setSession({ email });
    setWorkouts(found.workouts || []);
    setPlans(found.plans || []);
  };

  /* ================= SAVE ================= */
  const saveWorkout = () => {
    const updated = [currentWorkout, ...workouts];
    setWorkouts(updated);

    const users = readUsers().map((u) =>
      u.email === user.email ? { ...u, workouts: updated } : u
    );
    saveUsers(users);

    setCurrentWorkout(emptyWorkout());
  };

  /* ================= UI ================= */
  if (!user) {
    return (
      <div style={{ padding: 40 }}>
        <h1>{authMode === "signup" ? "Sign Up" : "Sign In"}</h1>

        {authMode === "signup" && (
          <input
            placeholder="Name"
            onChange={(e) => setFullName(e.target.value)}
          />
        )}

        <input
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleAuth}>Submit</button>

        <button
          onClick={() =>
            setAuthMode(authMode === "signin" ? "signup" : "signin")
          }
        >
          Switch Mode
        </button>

        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Welcome {user.fullName || "User"}</h1>

      <button onClick={saveWorkout}>Save Workout</button>

      <h2>Workouts</h2>
      {workouts.map((w) => (
        <div key={w.id}>
          <p>{w.date}</p>
        </div>
      ))}
    </div>
  );
}
