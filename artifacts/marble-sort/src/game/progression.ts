import { LEVELS } from "./levels";

const STORAGE_KEY = "marble-factory-progress";

export interface BestRun {
  score: number;
  timeSec: number;
  taps: number;
  stars: number;
}

interface Progress {
  unlocked: number[];
  completed: number[];
  bestRuns: Record<number, BestRun>;
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Progress>;
      return {
        unlocked: p.unlocked ?? [1],
        completed: p.completed ?? [],
        bestRuns: p.bestRuns ?? {},
      };
    }
  } catch {
    // ignore parse errors
  }
  return { unlocked: [1], completed: [], bestRuns: {} };
}

function save(p: Progress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function getProgress(): Progress {
  return load();
}

export function isUnlocked(levelId: number): boolean {
  return load().unlocked.includes(levelId);
}

export function isCompleted(levelId: number): boolean {
  return load().completed.includes(levelId);
}

export function unlockLevel(levelId: number): void {
  const p = load();
  if (!p.unlocked.includes(levelId)) p.unlocked.push(levelId);
  save(p);
}

export function markCompleted(levelId: number): void {
  const p = load();
  if (!p.completed.includes(levelId)) p.completed.push(levelId);
  save(p);
}

export function getHighestUnlocked(): number {
  const p = load();
  return p.unlocked.length > 0 ? Math.max(...p.unlocked) : 1;
}

export function recordRun(levelId: number, run: BestRun): void {
  const p = load();
  const prev = p.bestRuns[levelId];
  if (!prev || run.score > prev.score) {
    p.bestRuns[levelId] = run;
    save(p);
  }
}

export function getBestRun(levelId: number): BestRun | undefined {
  return load().bestRuns[levelId];
}

export function getAllBestRuns(): Record<number, BestRun> {
  return load().bestRuns;
}

export function getTotalScore(): number {
  const runs = load().bestRuns;
  return Object.values(runs).reduce((sum, r) => sum + r.score, 0);
}

export function getTotalStars(): number {
  const runs = load().bestRuns;
  return Object.values(runs).reduce((sum, r) => sum + r.stars, 0);
}

export function isAllCompleted(): boolean {
  const completed = load().completed;
  return LEVELS.every((l) => completed.includes(l.id));
}

export function resetProgress(): void {
  save({ unlocked: [1], completed: [], bestRuns: {} });
}
