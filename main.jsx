import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  Dumbbell,
  Flame,
  Home,
  LineChart,
  ListChecks,
  LogOut,
  Play,
  Plus,
  Save,
  Target,
  TimerReset,
  Trophy,
  User,
} from "lucide-react";

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
    {
      name: "parseNumericValue handles plain number",
      pass: parseNumericValue("15") === 15,
    },
    {
      name: "parseNumericValue handles seconds text",
      pass: parseNumericValue("30s") === 30,
    },
    {
      name: "parseNumericValue handles minutes text",
      pass: parseNumericValue("15 min") === 15,
    },
    {
      name: "buildMilestones returns best value per exercise",
      pass:
        buildMilestones([
          {
            exercises: [
              { name: "Push Ups", reps: "10" },
              { name: "Push Ups", reps: "12" },
            ],
          },
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
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 text-slate-900">{children}</div>;
}

function AuthScreen({ mode, onSwitch, onSubmit, error }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AppShell>
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
        <Card className="w-full rounded-3xl border-slate-200 shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-100">
              <Dumbbell className="h-10 w-10 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">{mode === "signup" ? "Create your account" : "Welcome back"}</CardTitle>
              <CardDescription className="pt-1">
                {mode === "signup" ? "Start your fitness journey today" : "Sign in to continue"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit({ fullName, email, password });
              }}
            >
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Emma (Doc) Norton" />
                </div>
              )}

              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@email.com" />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" />
              </div>

              {error && (
                <Alert className="border-red-200 text-red-700">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="h-12 w-full rounded-2xl bg-violet-600 text-base hover:bg-violet-700">
                {mode === "signup" ? "Create Account" : "Sign In"}
              </Button>
            </form>

            <div className="pt-4 text-center text-sm text-slate-500">
              {mode === "signup" ? "Already have an account?" : "Don’t have an account?"}{" "}
              <button type="button" onClick={onSwitch} className="font-medium text-violet-600 hover:underline">
                {mode === "signup" ? "Sign In" : "Sign Up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function BottomNav({ current, setCurrent }) {
  const items = [
    ["home", Home, "Home"],
    ["plan", CalendarDays, "Plan"],
    ["progress", BarChart3, "Progress"],
    ["profile", User, "Profile"],
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-white/90 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setCurrent(key)}
            className={`flex flex-col items-center gap-1 py-3 text-xs ${current === key ? "text-violet-600" : "text-slate-500"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScreenContainer({ title, subtitle, action, children }) {
  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6 md:max-w-6xl md:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="pt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function HomeScreen({ user, setScreen, streak, workouts, plans }) {
  const lastWorkout = workouts[0];

  return (
    <ScreenContainer
      title={`Hi, ${user.fullName || "Emma (Doc) Norton"} 👋`}
      subtitle="Welcome back"
      action={
        <Badge className="rounded-full bg-violet-100 px-3 py-2 text-violet-700 hover:bg-violet-100">
          <Flame className="mr-1 h-4 w-4" /> {streak} day streak
        </Badge>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="rounded-3xl border-0 bg-violet-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <Play className="h-8 w-8" />
              <Badge className="bg-white/15">Main</Badge>
            </div>
            <h2 className="text-xl font-semibold">Start Workout</h2>
            <p className="mt-1 text-sm text-violet-100">Track sets, reps, and notes without the app feeling too heavy.</p>
            <Button onClick={() => setScreen("start-workout")} className="mt-5 rounded-2xl bg-white text-violet-700 hover:bg-violet-50">
              Start Now
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100">
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            <h3 className="font-semibold">Current Streak</h3>
            <p className="mt-1 text-3xl font-bold">{streak}</p>
            <p className="text-sm text-slate-500">Keep showing up. Small progress still counts.</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm md:col-span-2 xl:col-span-1">
          <CardContent className="p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
              <ListChecks className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold">Plans Saved</h3>
            <p className="mt-1 text-3xl font-bold">{plans.length}</p>
            <p className="text-sm text-slate-500">Build your own plan or use a quick one.</p>
            <Button variant="outline" className="mt-4 rounded-2xl" onClick={() => setScreen("plan")}>Plan Workout</Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Last Workout</CardTitle>
          </CardHeader>
          <CardContent>
            {lastWorkout ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{lastWorkout.date} · {lastWorkout.mode}</div>
                {lastWorkout.exercises.slice(0, 3).map((exercise) => (
                  <div key={exercise.id} className="flex items-center justify-between rounded-2xl border p-3">
                    <span className="font-medium">{exercise.name}</span>
                    <span className="text-sm text-slate-500">{exercise.sets} × {exercise.reps}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No workouts yet. Start your first one.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="h-12 w-full justify-start rounded-2xl" onClick={() => setScreen("plan")}>
              <CalendarDays className="mr-2 h-4 w-4" /> Plan Workout
            </Button>
            <Button variant="outline" className="h-12 w-full justify-start rounded-2xl" onClick={() => setScreen("progress")}>
              <LineChart className="mr-2 h-4 w-4" /> View Progress
            </Button>
            <Button variant="outline" className="h-12 w-full justify-start rounded-2xl" onClick={() => setScreen("start-workout")}>
              <Activity className="mr-2 h-4 w-4" /> Continue Tracking
            </Button>
          </CardContent>
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
        setCurrentWorkout((prev) => ({
          ...prev,
          durationSeconds: (prev.durationSeconds || 0) + 1,
        }));
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
    setCurrentWorkout((prev) => ({
      ...prev,
      exercises: [...prev.exercises, createEmptyExercise()],
    }));
  };

  const removeExercise = (id) => {
    setCurrentWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((exercise) => exercise.id !== id),
    }));
  };

  return (
    <ScreenContainer
      title="Workout Session"
      subtitle={currentWorkout.mode}
      action={
        <Button variant="outline" className="rounded-2xl" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      }
    >
      <Card className="rounded-3xl border-0 bg-slate-900 text-white shadow-lg">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-slate-300">Timer</p>
            <p className="text-2xl font-bold">{formattedTime}</p>
          </div>
          <Button variant="secondary" className="rounded-2xl" onClick={() => setTimerRunning((value) => !value)}>
            <TimerReset className="mr-2 h-4 w-4" /> {timerRunning ? "Pause" : "Resume"}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-5 space-y-4">
        {currentWorkout.exercises.map((exercise, index) => (
          <Card key={exercise.id} className="rounded-3xl shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <Input
                  value={exercise.name}
                  onChange={(event) => updateExercise(exercise.id, "name", event.target.value)}
                  placeholder={`Exercise ${index + 1}`}
                  className="h-11 rounded-2xl font-medium"
                />
                <Button variant="outline" className="rounded-2xl" onClick={() => removeExercise(exercise.id)}>
                  Remove
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Sets</Label>
                  <Input
                    value={exercise.sets}
                    onChange={(event) => updateExercise(exercise.id, "sets", event.target.value)}
                    placeholder="3"
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reps / Time</Label>
                  <Input
                    value={exercise.reps}
                    onChange={(event) => updateExercise(exercise.id, "reps", event.target.value)}
                    placeholder="10 or 30s"
                    className="rounded-2xl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <Button variant="outline" className="rounded-2xl" onClick={addExercise}>
          <Plus className="mr-2 h-4 w-4" /> Add Exercise
        </Button>
      </div>

      <Card className="mt-5 rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Notes</CardTitle>
          <CardDescription>Write anything you want to remember from today.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={currentWorkout.notes}
            onChange={(event) => setCurrentWorkout((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="How did today feel? Any small wins?"
            className="min-h-28 rounded-2xl"
          />
        </CardContent>
      </Card>

      <Button onClick={onSaveWorkout} className="mt-5 h-12 w-full rounded-2xl bg-violet-600 text-base hover:bg-violet-700">
        <Save className="mr-2 h-4 w-4" /> End Workout and Save
      </Button>
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
      action={
        <Button variant="outline" className="rounded-2xl" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1fr,1.2fr]">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Choose Plan Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={planType} onValueChange={setPlanType}>
              <TabsList className="grid w-full grid-cols-2 rounded-2xl">
                <TabsTrigger value="Build Routine" className="rounded-2xl">Build Routine</TabsTrigger>
                <TabsTrigger value="Quick Plan" className="rounded-2xl">Quick Plan</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-3 pt-2">
              {Object.keys(defaultExercisesByGoal).map((itemGoal) => (
                <button
                  key={itemGoal}
                  type="button"
                  onClick={() => setGoal(itemGoal)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${goal === itemGoal ? "border-violet-300 bg-violet-50" : "hover:bg-slate-50"}`}
                >
                  <div>
                    <p className="font-medium">{itemGoal}</p>
                    <p className="text-sm text-slate-500">
                      {itemGoal === "Strength" ? "Build muscle" : itemGoal === "Endurance" ? "Improve stamina" : "Stay active"}
                    </p>
                  </div>
                  <Target className={`h-5 w-5 ${goal === itemGoal ? "text-violet-600" : "text-slate-400"}`} />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Your Plan Preview</CardTitle>
            <CardDescription>{planType} · {goal}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editableExercises.map((exercise, index) => (
              <div key={exercise.id} className="grid grid-cols-[1.5fr,.6fr,.8fr] gap-3 rounded-2xl border p-3">
                <Input
                  value={exercise.name}
                  onChange={(event) => updateItem(exercise.id, "name", event.target.value)}
                  placeholder={`Exercise ${index + 1}`}
                  className="rounded-2xl"
                />
                <Input
                  value={exercise.sets}
                  onChange={(event) => updateItem(exercise.id, "sets", event.target.value)}
                  placeholder="Sets"
                  className="rounded-2xl"
                />
                <Input
                  value={exercise.reps}
                  onChange={(event) => updateItem(exercise.id, "reps", event.target.value)}
                  placeholder="Reps"
                  className="rounded-2xl"
                />
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() =>
                  setEditableExercises((prev) => [...prev, { id: makeId(), name: "", sets: "", reps: "" }])
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
              <Button
                className="rounded-2xl bg-violet-600 hover:bg-violet-700"
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
          </CardContent>
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
      action={
        <Button variant="outline" className="rounded-2xl" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-6 text-center">
            <Flame className="mx-auto h-10 w-10 text-orange-500" />
            <p className="mt-3 text-3xl font-bold">{streak}</p>
            <p className="text-sm text-slate-500">Day streak</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-6 text-center">
            <Dumbbell className="mx-auto h-10 w-10 text-violet-600" />
            <p className="mt-3 text-3xl font-bold">{workouts.length}</p>
            <p className="text-sm text-slate-500">Workouts saved</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-6 text-center">
            <Trophy className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="mt-3 text-3xl font-bold">{milestones.length}</p>
            <p className="text-sm text-slate-500">Milestones</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5 rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle>Consistency</CardTitle>
          <CardDescription>Simple overall progress</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressValue} className="h-3 rounded-full" />
          <p className="mt-3 text-sm text-slate-500">You are building momentum one session at a time.</p>
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workouts.length ? (
              workouts.map((workout) => (
                <div key={workout.id} className="flex items-center justify-between rounded-2xl border p-3">
                  <div>
                    <p className="font-medium">{workout.date}</p>
                    <p className="text-sm text-slate-500">{workout.mode}</p>
                  </div>
                  <Badge variant="secondary">{workout.exercises.length} exercises</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No workouts yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestones.length ? (
              milestones.map((item, index) => (
                <div key={`${item.title}-${index}`} className="flex items-center gap-3 rounded-2xl border p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100">
                    <Trophy className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.value}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Milestones will show after you save workouts.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ScreenContainer>
  );
}

function ProfileScreen({ user, onLogout }) {
  return (
    <ScreenContainer title="Profile" subtitle="Your account">
      <Card className="rounded-3xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-100">
              <User className="h-8 w-8 text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.fullName || "User"}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" className="mt-6 rounded-2xl text-red-600" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </CardContent>
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

    const found = users.find(
      (item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password
    );

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
    return (
      <AuthScreen
        mode={authMode}
        onSwitch={() => {
          setAuthError("");
          setAuthMode((mode) => (mode === "signin" ? "signup" : "signin"));
        }}
        onSubmit={handleAuth}
        error={authError}
      />
    );
  }

  return (
    <AppShell>
      <div className="hidden border-b bg-white/80 backdrop-blur md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100">
              <Dumbbell className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="font-semibold">FitNotes Flow</p>
              <p className="text-sm text-slate-500">Mid-fidelity working prototype</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant={screen === "home" ? "default" : "outline"} className="rounded-2xl" onClick={() => setScreen("home")}>Home</Button>
            <Button variant={screen === "plan" ? "default" : "outline"} className="rounded-2xl" onClick={() => setScreen("plan")}>Plan</Button>
            <Button variant={screen === "progress" ? "default" : "outline"} className="rounded-2xl" onClick={() => setScreen("progress")}>Progress</Button>
            <Button variant={screen === "profile" ? "default" : "outline"} className="rounded-2xl" onClick={() => setScreen("profile")}>Profile</Button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
        >
          {screen === "home" && (
            <HomeScreen
              user={user}
              setScreen={setScreen}
              streak={streak}
              workouts={user.workouts || []}
              plans={user.plans || []}
            />
          )}

          {screen === "start-workout" && (
            <StartWorkoutScreen
              currentWorkout={currentWorkout}
              setCurrentWorkout={setCurrentWorkout}
              onSaveWorkout={saveWorkout}
              onBack={() => setScreen("home")}
            />
          )}

          {screen === "plan" && <PlanScreen onBack={() => setScreen("home")} onSavePlan={savePlan} />}
          {screen === "progress" && <ProgressScreen workouts={user.workouts || []} onBack={() => setScreen("home")} />}
          {screen === "profile" && <ProfileScreen user={user} onLogout={logout} />}
        </motion.div>
      </AnimatePresence>

      <BottomNav current={screen === "start-workout" ? "home" : screen} setCurrent={setScreen} />
    </AppShell>
  );
}
