// Settings for the "Training" section on the About page (data from Hevy).
//
// The section only appears when a Hevy API key is available at build time.
// The key is NEVER stored in this repo. See the README note: add it as a GitHub
// secret called HEVY_API_KEY (Settings → Secrets and variables → Actions).

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
    { match: "leg extension", label: "Leg Extension" },
  ],

  // How far back to look. Hevy returns 10 workouts per request, so 10 pages is
  // Latest ~100 workouts.
  historyPages: 10,
};
