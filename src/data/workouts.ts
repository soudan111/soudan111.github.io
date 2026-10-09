export const hevy = {
  // "lb" or "kg"
  units: "lb" as "lb" | "kg",

  // Used to show dates in your own timezone.
  timeZone: "America/Los_Angeles",

  // Which parts to show. Turn off anything you'd rather keep private.
  showStats: true,
  showRecent: true,
  showLifts: true,

  // How many recent workouts to list.
  recentCount: 4,

  // Lifts to chart. Each entry is matched against your exercise names in Hevy,
  // ignoring capitals, so "bench press" matches "Bench Press (Barbell)".
  // "label" is the heading shown on the site.
  trackedLifts: [
    { match: "bench press", label: "Bench press" },
    { match: "squat", label: "Squat" },
    { match: "deadlift", label: "Deadlift" },
    { match: "leg press", label: "Leg Press" },
    { match: "triceps pushdown", label: "Tricep Pushdown" },
  ],

  // How far back to look. Hevy returns 10 workouts per request, so 10 pages is
  // Latest ~100 workouts.
  historyPages: 10,
};
