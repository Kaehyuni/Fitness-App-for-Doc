import React, { useEffect, useMemo, useState } from "react";
import "./index.css";

const STORAGE_KEYS = {
  users: "fit_notes_users_v1",
  session: "fit_notes_session_v1",
};

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
  {
    label: "Quick Home Plan",
    goal: "General Fitness",
    items: [
      { name: "Push Ups", sets: "2", reps: "8" },
      { name: "Squats", sets: "2", reps: "12" },
      { name: "Lunges", sets: "2", reps: "10" },
      { name: "Plank", sets: "2", reps: "20s" },
    ],
  },
];

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.users) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.session) || "null");
  } catch {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function parseNumericValue(value) {
  const cleaned = String(value ?? "").replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createEmptyExercise() {
  return { id: makeId(), name: "", sets: "", reps: "" };
}

function emptyWorkout(mode = "Gym Workout") {
  return {
    id: makeId(),
    date: todayLabel(),
    mode,
    exercises: [
      { id: makeId(), name: "Push Ups", sets: "3", reps: "10" },
      { id: makeId(), name: "Lat Pulldown", sets: "3", reps: "8" },
    ],
    notes: "",
    durationSeconds: 0,
  };
}

function computeStreak(workouts) {
  if (!workouts.length) return 0;

  const uniqueDays = [...new Set(workouts.map((w) => new Date(w.savedAt || w.date).toDateString()))]
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  let compare = current;

  for (let i = 0; i < uniqueDays.length; i += 1) {
    const day = new Date(uniqueDays[i]);
    day.setHours(0, 0, 0, 0);

    if (i === 0) {
      const diff = Math.round((compare.getTime() - day.getTime()) / 86400000);
      if (diff > 1) return 0;
      compare = day;
      streak = 1;
      continue;
    }

    const prev = new Date(compare);
    prev.setDate(prev.getDate() - 1);
    if (day.getTime() === prev.getTime()) {
      streak += 1;
      compare = day;
    } else {
      break;
    }
  }

  return streak;
}

function buildMilestones(workouts) {
  const map = {};

  workouts.forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      if (!exercise?.name) return;
      const repsNum = parseNumericValue(exercise.reps);
      if (!map[exercise.name]) {
        map[exercise.name] = { best: repsNum, label: exercise.name };
      } else if (repsNum > map[exercise.name].best) {
        map[exercise.name].best = repsNum;
      }
    });
  });

  return Object.values(map)
    .filter((item) => item.best > 0)
    .slice(0, 6)
    .map((item) => ({ title: item.label, value: `Best ${item.best}` }));
}

function runMiniTests() {
  const tests = [
    { name: "parse numeric plain", pass: parseNumericValue("15") === 15 },
    { name: "parse numeric seconds", pass: parseNumericValue("30s") === 30 },
    { name: "parse numeric minutes", pass: parseNumericValue("15 min") === 15 },
    {
      name: "best milestone value",
      pass:
        buildMilestones([
          { exercises: [{ name: "Push Ups", reps: "10" }, { name: "Push Ups", reps: "12" }] },
        ])[0]?.value === "Best 12",
    },
  ];

  const failed = tests.filter((test) => !test.pass);
  if (failed.length > 0) {
    console.warn("Mini tests failed:", failed);
  }
}

if (typeof window !== "undefined") {
  runMiniTests();
}

function AppShell({ children }) {
  return <div className="app-shell">{children}</div>;
}

function Button({ children, variant = "primary", type = "button", onClick, className = "", disabled = false }) {
  const variantClass = variant === "secondary" ? "btn btn-secondary" : variant === "ghost" ? "btn btn-ghost" : variant === "danger" ? "btn btn-danger" : "btn";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${variantClass} ${className}`.trim()}>
      {children}
    </button>
  );
}

function Card({ children, className = "" }) {
  return <section className={`card ${className}`.trim()}>{children}</section>;
}

function ScreenContainer({ title, subtitle, action, children }) {
  return (
    <main className="screen">
      <div className="screen-header">
        <div>
          <h1 className="screen-title">{title}</h1>
          {subtitle ? <p className="screen-subtitle">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </main>
  );
}

function AuthScreen({ mode, onSwitch, onSubmit, error }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AppShell>
      <div className="auth-wrap">
        <Card className="auth-card">
          <div className="card-body stack">
            <div className="center-text">
              <div className="logo-circle">🏋️</div>
              <h1 className="screen-title" style={{ fontSize: 32, marginBottom: 8 }}>
                {mode === "signup" ? "Create your account" : "Welcome back"}
              </h1>
              <p className="muted">
                {mode === "signup" ? "Start your fitness journey today" : "Sign in to continue"}
              </p>
            </div>

            <form
              className="stack"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit({ fullName, email, password });
              }}
            >
              {mode === "signup" ? (
                <div className="form-group">
                  <label className="label">Full Name</label>
                  <input className="input" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Emma (Doc) Norton" />
                </div>
              ) : null}

              <div className="form-group">
                <label className="label">Email</label>
                <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@email.com" />
              </div>

              <div className="form-group">
                <label className="label">Password</label>
                <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" />
              </div>

              {error ? <div className="alert">{error}</div> : null}

              <Button type="submit">{mode === "signup" ? "Create Account" : "Sign In"}</Button>
            </form>

            <p className="center-text muted" style={{ margin: 0 }}>
              {mode === "signup" ? "Already have an account?" : "Don’t have an account?"}{" "}
              <button type="button" onClick={onSwitch} className="small-link">
                {mode === "signup" ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function TopBar({ screen, setScreen }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="brand-icon">🏋️</div>
          <div>
            <div className="brand-title">FitNotes Flow</div>
            <div className="brand-subtitle">Plain JSX, HTML, and CSS version</div>
          </div>
        </div>
        <nav className="nav-inline">
          <Button variant={screen === "home" ? "primary" : "secondary"} onClick={() => setScreen("home")}>Home</Button>
          <Button variant={screen === "plan" ? "primary" : "secondary"} onClick={() => setScreen("plan")}>Plan</Button>
          <Button variant={screen === "progress" ? "primary" : "secondary"} onClick={() => setScreen("progress")}>Progress</Button>
          <Button variant={screen === "profile" ? "primary" : "secondary"} onClick={() => setScreen("profile")}>Profile</Button>
        </nav>
      </div>
    </header>
  );
}

function BottomNav({ current, setCurrent }) {
  const items = [
    ["home", "🏠", "Home"],
    ["plan", "📅", "Plan"],
    ["progress", "📊", "Progress"],
    ["profile", "👤", "Profile"],
  ];

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {items.map(([key, icon, label]) => (
          <button key={key} type="button" className={`nav-btn ${current === key ? "active" : ""}`} onClick={() => setCurrent(key)}>
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function HomeScreen({ user, setScreen, streak, workouts, plans }) {
  const lastWorkout = workouts[0];

  return (
    <ScreenContainer
      title={`Hi, ${user.fullName || "Emma (Doc) Norton"} 👋`}
      subtitle="Welcome back"
      action={<div className="badge">🔥 {streak} day streak</div>}
    >
      <div className="grid grid-3">
        <Card className="hero-card">
          <div className="card-body">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 28 }}>▶️</div>
              <span className="mini-badge">Main</span>
            </div>
            <h2 style={{ margin: "0 0 8px" }}>Start Workout</h2>
            <p style={{ margin: 0 }}>Track sets, reps, and notes without the app feeling too heavy.</p>
            <div style={{ marginTop: 20 }}>
              <Button variant="secondary" onClick={() => setScreen("start-workout")}>Start Now</Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-body metric-card">
            <div style={{ fontSize: 28 }}>🔥</div>
            <div className="metric-value">{streak}</div>
            <div className="metric-label">Current streak</div>
            <p className="muted" style={{ marginBottom: 0 }}>Keep showing up. Small progress still counts.</p>
          </div>
        </Card>

        <Card>
          <div className="card-body metric-card">
            <div style={{ fontSize: 28 }}>📝</div>
            <div className="metric-value">{plans.length}</div>
            <div className="metric-label">Plans saved</div>
            <p className="muted">Build your own plan or use a quick one.</p>
            <Button variant="secondary" onClick={() => setScreen("plan")}>Plan Workout</Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <Card>
          <div className="card-body stack">
            <h3 style={{ margin: 0 }}>Last Workout</h3>
            {lastWorkout ? (
              <>
                <div className="pill">{lastWorkout.date} · {lastWorkout.mode}</div>
                {lastWorkout.exercises.slice(0, 3).map((exercise) => (
                  <div key={exercise.id} className="list-item">
                    <strong>{exercise.name}</strong>
                    <span className="muted">{exercise.sets} × {exercise.reps}</span>
                  </div>
                ))}
              </>
            ) : (
              <p className="muted" style={{ margin: 0 }}>No workouts yet. Start your first one.</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="card-body stack">
            <h3 style={{ margin: 0 }}>Quick Actions</h3>
            <Button variant="secondary" onClick={() => setScreen("plan")}>📅 Plan Workout</Button>
            <Button variant="secondary" onClick={() => setScreen("progress")}>📊 View Progress</Button>
            <Button variant="secondary" onClick={() => setScreen("start-workout")}>🏃 Continue Tracking</Button>
          </div>
        </Card>
      </div>
    </ScreenContainer>
  );
}

function StartWorkoutScreen({ currentWorkout, setCurrentWorkout, onSaveWorkout, onBack }) {
  const [timerRunning, setTimerRunning] = useState(true);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (timerRunning) {
        setCurrentWorkout((prev) => ({ ...prev, durationSeconds: (prev.durationSeconds || 0) + 1 }));
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timerRunning, setCurrentWorkout]);

  const formattedTime = useMemo(() => {
    const secs = currentWorkout.durationSeconds || 0;
    const minutes = String(Math.floor(secs / 60)).padStart(2, "0");
    const seconds = String(secs % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [currentWorkout.durationSeconds]);

  const updateExercise = (id, field, value) => {
    setCurrentWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) => (exercise.id === id ? { ...exercise, [field]: value } : exercise)),
    }));
  };

  const addExercise = () => {
    setCurrentWorkout((prev) => ({ ...prev, exercises: [...prev.exercises, createEmptyExercise()] }));
  };

  const removeExercise = (id) => {
    setCurrentWorkout((prev) => ({ ...prev, exercises: prev.exercises.filter((exercise) => exercise.id !== id) }));
  };

  return (
    <ScreenContainer
      title="Workout Session"
      subtitle={currentWorkout.mode}
      action={<Button variant="secondary" onClick={onBack}>← Back</Button>}
    >
      <Card className="timer-card">
        <div className="card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <div className="timer-sub">Timer</div>
            <div className="timer-value">{formattedTime}</div>
          </div>
          <Button variant="secondary" onClick={() => setTimerRunning((value) => !value)}>
            {timerRunning ? "Pause" : "Resume"}
          </Button>
        </div>
      </Card>

      <div className="exercise-grid" style={{ marginTop: 16 }}>
        {currentWorkout.exercises.map((exercise, index) => (
          <Card key={exercise.id}>
            <div className="card-body stack">
              <div className="exercise-top">
                <input
                  className="input"
                  value={exercise.name}
                  onChange={(event) => updateExercise(exercise.id, "name", event.target.value)}
                  placeholder={`Exercise ${index + 1}`}
                />
                <Button variant="secondary" onClick={() => removeExercise(exercise.id)}>Remove</Button>
              </div>
              <div className="exercise-fields">
                <div className="form-group">
                  <label className="label">Sets</label>
                  <input className="input" value={exercise.sets} onChange={(event) => updateExercise(exercise.id, "sets", event.target.value)} placeholder="3" />
                </div>
                <div className="form-group">
                  <label className="label">Reps / Time</label>
                  <input className="input" value={exercise.reps} onChange={(event) => updateExercise(exercise.id, "reps", event.target.value)} placeholder="10 or 30s" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="btn-row" style={{ marginTop: 16 }}>
        <Button variant="secondary" onClick={addExercise}>+ Add Exercise</Button>
      </div>

      <Card style={{ marginTop: 16 }}>
        <div className="card-body stack">
          <div>
            <h3 style={{ margin: "0 0 8px" }}>Notes</h3>
            <p className="muted" style={{ margin: 0 }}>Write anything you want to remember from today.</p>
          </div>
          <textarea
            className="textarea"
            value={currentWorkout.notes}
            onChange={(event) => setCurrentWorkout((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="How did today feel? Any small wins?"
          />
        </div>
      </Card>

      <div style={{ marginTop: 16 }}>
        <Button onClick={onSaveWorkout}>💾 End Workout and Save</Button>
      </div>
    </ScreenContainer>
  );
}

function PlanScreen({ onBack, onSavePlan }) {
  const [planType, setPlanType] = useState("Build Routine");
  const [goal, setGoal] = useState("Strength");
  const [editableExercises, setEditableExercises] = useState(
    defaultExercisesByGoal.Strength.map((item) => ({ ...item, id: makeId() }))
  );

  useEffect(() => {
    const source = planType === "Quick Plan" ? quickPlans[0].items : defaultExercisesByGoal[goal];
    setEditableExercises(source.map((item) => ({ ...item, id: makeId() })));
  }, [goal, planType]);

  const updateItem = (id, field, value) => {
    setEditableExercises((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  return (
    <ScreenContainer
      title="Plan Workout"
      subtitle="Build your own plan or use a quick one"
      action={<Button variant="secondary" onClick={onBack}>← Back</Button>}
    >
      <div className="grid grid-plan">
        <Card>
          <div className="card-body stack">
            <h3 style={{ margin: 0 }}>Choose Plan Type</h3>
            <div className="plan-toggle">
              <Button variant={planType === "Build Routine" ? "primary" : "secondary"} onClick={() => setPlanType("Build Routine")}>Build Routine</Button>
              <Button variant={planType === "Quick Plan" ? "primary" : "secondary"} onClick={() => setPlanType("Quick Plan")}>Quick Plan</Button>
            </div>

            <div className="stack">
              {Object.keys(defaultExercisesByGoal).map((itemGoal) => (
                <button key={itemGoal} type="button" className={`goal-button ${goal === itemGoal ? "active" : ""}`} onClick={() => setGoal(itemGoal)}>
                  <span>
                    <strong>{itemGoal}</strong>
                    <br />
                    <span className="muted" style={{ fontSize: 14 }}>
                      {itemGoal === "Strength" ? "Build muscle" : itemGoal === "Endurance" ? "Improve stamina" : "Stay active"}
                    </span>
                  </span>
                  <span>{goal === itemGoal ? "✓" : "○"}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-body stack">
            <div>
              <h3 style={{ margin: "0 0 8px" }}>Your Plan Preview</h3>
              <p className="muted" style={{ margin: 0 }}>{planType} · {goal}</p>
            </div>

            {editableExercises.map((exercise, index) => (
              <div key={exercise.id} className="preview-row">
                <input className="input" value={exercise.name} onChange={(event) => updateItem(exercise.id, "name", event.target.value)} placeholder={`Exercise ${index + 1}`} />
                <input className="input" value={exercise.sets} onChange={(event) => updateItem(exercise.id, "sets", event.target.value)} placeholder="Sets" />
                <input className="input" value={exercise.reps} onChange={(event) => updateItem(exercise.id, "reps", event.target.value)} placeholder="Reps" />
              </div>
            ))}

            <div className="btn-row">
              <Button variant="secondary" onClick={() => setEditableExercises((prev) => [...prev, { id: makeId(), name: "", sets: "", reps: "" }])}>+ Add Item</Button>
              <Button
                onClick={() =>
                  onSavePlan({
                    id: makeId(),
                    label: `${goal} Plan`,
                    goal,
                    createdAt: todayLabel(),
                    items: editableExercises.map(({ id, ...rest }) => rest),
                  })
                }
              >
                Save Plan
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </ScreenContainer>
  );
}

function ProgressScreen({ workouts, onBack }) {
  const streak = computeStreak(workouts);
  const milestones = buildMilestones(workouts);
  const progressValue = Math.min(workouts.length * 10, 100);

  return (
    <ScreenContainer
      title="Progress"
      subtitle="Track your consistency and improvements"
      action={<Button variant="secondary" onClick={onBack}>← Back</Button>}
    >
      <div className="grid grid-3">
        <Card>
          <div className="card-body metric-card">
            <div style={{ fontSize: 28 }}>🔥</div>
            <div className="metric-value">{streak}</div>
            <div className="metric-label">Day streak</div>
          </div>
        </Card>
        <Card>
          <div className="card-body metric-card">
            <div style={{ fontSize: 28 }}>🏋️</div>
            <div className="metric-value">{workouts.length}</div>
            <div className="metric-label">Workouts saved</div>
          </div>
        </Card>
        <Card>
          <div className="card-body metric-card">
            <div style={{ fontSize: 28 }}>🏆</div>
            <div className="metric-value">{milestones.length}</div>
            <div className="metric-label">Milestones</div>
          </div>
        </Card>
      </div>

      <Card style={{ marginTop: 16 }}>
        <div className="card-body stack">
          <div>
            <h3 style={{ margin: "0 0 8px" }}>Consistency</h3>
            <p className="muted" style={{ margin: 0 }}>Simple overall progress</p>
          </div>
          <div className="progress-shell">
            <div className="progress-fill" style={{ width: `${progressValue}%` }} />
          </div>
          <p className="muted" style={{ margin: 0 }}>You are building momentum one session at a time.</p>
        </div>
      </Card>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <Card>
          <div className="card-body stack">
            <h3 style={{ margin: 0 }}>Timeline</h3>
            {workouts.length ? (
              workouts.map((workout) => (
                <div key={workout.id} className="list-item timeline-item">
                  <div>
                    <strong>{workout.date}</strong>
                    <div className="muted" style={{ fontSize: 14 }}>{workout.mode}</div>
                  </div>
                  <span className="pill">{workout.exercises.length} exercises</span>
                </div>
              ))
            ) : (
              <p className="muted" style={{ margin: 0 }}>No workouts yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="card-body stack">
            <h3 style={{ margin: 0 }}>Milestones</h3>
            {milestones.length ? (
              milestones.map((item, index) => (
                <div key={`${item.title}-${index}`} className="list-item">
                  <div>
                    <strong>{item.title}</strong>
                    <div className="muted" style={{ fontSize: 14 }}>{item.value}</div>
                  </div>
                  <span>🏆</span>
                </div>
              ))
            ) : (
              <p className="muted" style={{ margin: 0 }}>Milestones will show after you save workouts.</p>
            )}
          </div>
        </Card>
      </div>
    </ScreenContainer>
  );
}

function ProfileScreen({ user, onLogout }) {
  return (
    <ScreenContainer title="Profile" subtitle="Your account">
      <Card>
        <div className="card-body stack">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="logo-circle" style={{ width: 64, height: 64, margin: 0, borderRadius: 22, fontSize: 24 }}>👤</div>
            <div>
              <h2 style={{ margin: "0 0 6px" }}>{user.fullName || "User"}</h2>
              <p className="muted" style={{ margin: 0 }}>{user.email}</p>
            </div>
          </div>
          <div>
            <Button variant="danger" onClick={onLogout}>Log Out</Button>
          </div>
        </div>
      </Card>
    </ScreenContainer>
  );
}

export default function FitnessAppMidFi() {
  const [authMode, setAuthMode] = useState("signin");
  const [authError, setAuthError] = useState("");
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("home");
  const [currentWorkout, setCurrentWorkout] = useState(emptyWorkout());

  useEffect(() => {
    const session = getSession();
    if (session?.email) {
      const users = readUsers();
      const found = users.find((item) => item.email === session.email);
      if (found) setUser(found);
    }
  }, []);

  const streak = computeStreak(user?.workouts || []);

  const handleAuth = ({ fullName, email, password }) => {
    setAuthError("");
    const users = readUsers();

    if (!email || !password || (authMode === "signup" && !fullName)) {
      setAuthError("Please fill in all required fields.");
      return;
    }

    if (authMode === "signup") {
      const exists = users.some((item) => item.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        setAuthError("That email already has an account.");
        return;
      }

      const newUser = {
        fullName,
        email,
        password,
        workouts: [],
        plans: [],
      };

      const nextUsers = [...users, newUser];
      saveUsers(nextUsers);
      setSession({ email });
      setUser(newUser);
      setScreen("home");
      return;
    }

    const found = users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password);

    if (!found) {
      setAuthError("Incorrect email or password.");
      return;
    }

    setSession({ email: found.email });
    setUser(found);
    setScreen("home");
  };

  const updateUser = (updater) => {
    setUser((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const users = readUsers();
      const updatedUsers = users.map((item) => (item.email === next.email ? next : item));
      saveUsers(updatedUsers);
      return next;
    });
  };

  const saveWorkout = () => {
    if (!user) return;

    const cleanedExercises = currentWorkout.exercises.filter((exercise) => exercise.name.trim());
    const workoutToSave = {
      ...currentWorkout,
      exercises: cleanedExercises,
      savedAt: new Date().toISOString(),
      date: todayLabel(),
    };

    updateUser((prev) => ({
      ...prev,
      workouts: [workoutToSave, ...(prev.workouts || [])],
    }));

    setCurrentWorkout(emptyWorkout(currentWorkout.mode));
    setScreen("progress");
  };

  const savePlan = (plan) => {
    updateUser((prev) => ({
      ...prev,
      plans: [plan, ...(prev.plans || [])],
    }));
    setScreen("home");
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.session);
    setUser(null);
    setScreen("home");
    setAuthMode("signin");
    setAuthError("");
  };

  if (!user) {
    return <AuthScreen mode={authMode} onSwitch={() => { setAuthError(""); setAuthMode((mode) => (mode === "signin" ? "signup" : "signin")); }} onSubmit={handleAuth} error={authError} />;
  }

  return (
    <AppShell>
      <TopBar screen={screen} setScreen={setScreen} />

      {screen === "home" ? <HomeScreen user={user} setScreen={setScreen} streak={streak} workouts={user.workouts || []} plans={user.plans || []} /> : null}
      {screen === "start-workout" ? <StartWorkoutScreen currentWorkout={currentWorkout} setCurrentWorkout={setCurrentWorkout} onSaveWorkout={saveWorkout} onBack={() => setScreen("home")} /> : null}
      {screen === "plan" ? <PlanScreen onBack={() => setScreen("home")} onSavePlan={savePlan} /> : null}
      {screen === "progress" ? <ProgressScreen workouts={user.workouts || []} onBack={() => setScreen("home")} /> : null}
      {screen === "profile" ? <ProfileScreen user={user} onLogout={logout} /> : null}

      <BottomNav current={screen === "start-workout" ? "home" : screen} setCurrent={setScreen} />
    </AppShell>
  );
}
