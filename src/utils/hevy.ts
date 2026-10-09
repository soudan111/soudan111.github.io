/**
 * Read your workouts from the Hevy API while the site builds and boil them
 * down to a few safe summaries: counts, recent sessions, and lift progress.
 *
 * The API key comes from the HEVY_API_KEY environment variable (a GitHub
 * secret in the deploy workflow). It is only used during the build and is never
 * written into the page. Nothing here can fail the build; problems are logged
 * with a "[hevy]" prefix and the section simply hides.
 */
import { hevy } from "../data/workouts";

const API = "https://api.hevyapp.com/v1/workouts";
const PAGE_SIZE = 10;
const TIMEOUT_MS = 20000;
const KG_TO_LB = 2.20462262;

/* -------------------------------- Types -------------------------------- */

export interface RecentExercise {
  name: string;
  sets: number;
  best: string; // e.g. "185 lb × 8", "BW × 12", "45 min"
}

export interface RecentWorkout {
  title: string;
  date: string;
  duration: string;
  exercises: RecentExercise[];
  more: number;
}

export interface LiftProgress {
  label: string;
  latest: number; // estimated 1RM in chosen units
  change: number; // latest minus first point, chosen units
  since: string; // date of first point
  points: number[]; // chronological estimated 1RMs
}

export interface Stat {
  value: string;
  label: string;
}

export interface HevyData {
  stats: Stat[];
  recent: RecentWorkout[];
  lifts: LiftProgress[];
  units: string;
}

/* ------------------------------- Helpers ------------------------------- */

function convert(kg: number): number {
  return hevy.units === "lb" ? kg * KG_TO_LB : kg;
}

function round(n: number): number {
  return hevy.units === "lb" ? Math.round(n) : Math.round(n * 2) / 2;
}

function fmtWeight(kg: number): string {
  return `${round(convert(kg)).toLocaleString("en-US")} ${hevy.units}`;
}

function fmtDate(iso: string, withYear = false): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: hevy.timeZone,
  });
}

function minutes(start?: string, end?: string): number {
  const a = new Date(start ?? "").getTime();
  const b = new Date(end ?? "").getTime();
  if (isNaN(a) || isNaN(b) || b <= a) return 0;
  return Math.round((b - a) / 60000);
}

const isWorkingSet = (s: any) => s?.type !== "warmup";

/** Epley estimate of a one-rep max. Reps above 12 are too noisy to use. */
function estimate1RM(weightKg: number, reps: number): number {
  if (!weightKg || !reps || reps > 12) return 0;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

function bestSet(sets: any[]): string {
  const weighted = sets.filter((s) => isWorkingSet(s) && s.weight_kg && s.reps);
  if (weighted.length) {
    const top = weighted.reduce((a, b) =>
      a.weight_kg * a.reps >= b.weight_kg * b.reps ? a : b,
    );
    return `${fmtWeight(top.weight_kg)} × ${top.reps}`;
  }
  const reps = sets.filter((s) => isWorkingSet(s) && s.reps);
  if (reps.length) return `BW × ${Math.max(...reps.map((s) => s.reps))}`;
  const secs = sets.reduce((t, s) => t + (s.duration_seconds ?? 0), 0);
  if (secs) return `${Math.round(secs / 60)} min`;
  const meters = sets.reduce((t, s) => t + (s.distance_meters ?? 0), 0);
  if (meters) return `${(meters / 1000).toFixed(1)} km`;
  return "";
}

/* -------------------------------- Fetch -------------------------------- */

async function fetchWorkouts(apiKey: string): Promise<any[]> {
  const all: any[] = [];
  for (let page = 1; page <= hevy.historyPages; page++) {
    const res = await fetch(`${API}?page=${page}&pageSize=${PAGE_SIZE}`, {
      headers: { "api-key": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // Keep whatever pages we already have.
      if (all.length === 0) throw new Error(`HTTP ${res.status}`);
      console.warn(`[hevy] Page ${page} failed (HTTP ${res.status}); using ${all.length} workouts.`);
      break;
    }
    const data: any = await res.json();
    all.push(...(data.workouts ?? []));
    if (page >= (data.page_count ?? 1)) break;
  }
  return all;
}

/* ------------------------------ Summaries ------------------------------ */

export function summarize(workouts: any[], now: Date = new Date()): HevyData {
  const sorted = [...workouts]
    .filter((w) => w?.start_time)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const DAY = 86400000;
  const within = (days: number) =>
    sorted.filter((w) => now.getTime() - new Date(w.start_time).getTime() <= days * DAY);

  const last7 = within(7);
  const last30 = within(30);
  const last56 = within(56);

  const volumeKg = last30.reduce(
    (total, w) =>
      total +
      (w.exercises ?? []).reduce(
        (t: number, e: any) =>
          t +
          (e.sets ?? [])
            .filter(isWorkingSet)
            .reduce((v: number, s: any) => v + (s.weight_kg ?? 0) * (s.reps ?? 0), 0),
        0,
      ),
    0,
  );

  const stats: Stat[] = [
    { value: String(last7.length), label: "workouts this week" },
    { value: String(last30.length), label: "workouts in 30 days" },
    { value: (Math.round((last56.length / 8) * 10) / 10).toString(), label: "per week, last 8 weeks" },
    {
      value: `${Math.round(convert(volumeKg)).toLocaleString("en-US")} ${hevy.units}`,
      label: "lifted in 30 days",
    },
  ];

  const recent: RecentWorkout[] = sorted.slice(0, hevy.recentCount).map((w) => {
    const exercises: RecentExercise[] = (w.exercises ?? []).map((e: any) => ({
      name: e.title ?? "Exercise",
      sets: (e.sets ?? []).filter(isWorkingSet).length,
      best: bestSet(e.sets ?? []),
    }));
    const mins = minutes(w.start_time, w.end_time);
    return {
      title: w.title || "Workout",
      date: fmtDate(w.start_time),
      duration: mins ? `${mins} min` : "",
      exercises: exercises.slice(0, 5),
      more: Math.max(0, exercises.length - 5),
    };
  });

  const lifts: LiftProgress[] = [];
  for (const lift of hevy.trackedLifts) {
    const needle = lift.match.toLowerCase();
    const series: { date: string; e1rm: number }[] = [];
    for (const w of [...sorted].reverse()) {
      let best = 0;
      for (const e of w.exercises ?? []) {
        if (!String(e.title ?? "").toLowerCase().includes(needle)) continue;
        for (const s of e.sets ?? []) {
          if (isWorkingSet(s)) best = Math.max(best, estimate1RM(s.weight_kg, s.reps));
        }
      }
      if (best > 0) series.push({ date: w.start_time, e1rm: convert(best) });
    }
    if (series.length >= 2) {
      const first = series[0];
      const last = series[series.length - 1];
      lifts.push({
        label: lift.label,
        latest: round(last.e1rm),
        change: round(last.e1rm) - round(first.e1rm),
        since: fmtDate(first.date, true),
        points: series.map((p) => p.e1rm),
      });
    }
  }

  return { stats, recent, lifts, units: hevy.units };
}

/* -------------------------------- Public ------------------------------- */

export async function getHevyData(): Promise<HevyData | null> {
  const apiKey = process.env.HEVY_API_KEY?.trim();
  if (!apiKey) {
    console.log("[hevy] No HEVY_API_KEY set; the Training section is hidden.");
    return null;
  }
  try {
    const workouts = await fetchWorkouts(apiKey);
    console.log(`[hevy] Loaded ${workouts.length} workouts.`);
    if (workouts.length === 0) return null;
    return summarize(workouts);
  } catch (err) {
    console.warn(`[hevy] Could not load workouts: ${(err as Error).message}`);
    return null;
  }
}
