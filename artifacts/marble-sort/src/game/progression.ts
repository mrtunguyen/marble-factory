const STORAGE_KEY = "marble-factory-progress";

interface Progress {
  unlocked: number[]; // level ids that are unlocked
  completed: number[]; // level ids that have been completed
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Progress;
  } catch {
    // ignore parse errors
  }
  return { unlocked: [1], completed: [] };
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

export function resetProgress(): void {
  save({ unlocked: [1], completed: [] });
}
