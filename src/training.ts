export const library = [
  { id: 'bench', name: 'Bench Press', group: 'Chest' },
  { id: 'row', name: 'Barbell Row', group: 'Back' },
  { id: 'press', name: 'Overhead Press', group: 'Shoulders' },
  { id: 'pulldown', name: 'Lat Pulldown', group: 'Back' },
  { id: 'squat', name: 'Back Squat', group: 'Legs' },
  { id: 'deadlift', name: 'Romanian Deadlift', group: 'Legs' },
  { id: 'split', name: 'Split Squat', group: 'Legs' },
  { id: 'leg-curl', name: 'Leg Curl', group: 'Legs' },
  { id: 'curl', name: 'Dumbbell Curl', group: 'Arms' },
  { id: 'push-up', name: 'Push-up', group: 'Chest' },
] as const;

export type ExerciseId = (typeof library)[number]['id'];
export const exercise = (id: ExerciseId) => library.find((item) => item.id === id)!;

export type Target = { exerciseId: ExerciseId; sets: number; reps: number };
export type Routine = { id: string; name: string; targets: Target[] };
export type SetEntry = { id: string; weight: string; reps: string; done: boolean };
export type Lift = { exerciseId: ExerciseId; sets: SetEntry[] };
export type Draft = { id: string; name: string; startedAt: number; restUntil: number | null; lifts: Lift[] };
export type Workout = Omit<Draft, 'restUntil'> & { finishedAt: number };
export type Journal = { routines: Routine[]; history: Workout[]; draft: Draft | null };
export type Workspace = 'demo' | 'personal';

export const emptyJournal = (): Journal => ({ routines: [], history: [], draft: null });

export function makeSet(reps = ''): SetEntry {
  return { id: crypto.randomUUID(), weight: '', reps, done: false };
}

export function startWorkout(routine?: Routine, startedAt = Date.now()): Draft {
  return {
    id: crypto.randomUUID(), name: routine?.name ?? 'Free Workout', startedAt, restUntil: null,
    lifts: (routine?.targets ?? []).map((target) => ({
      exerciseId: target.exerciseId,
      sets: Array.from({ length: target.sets }, () => makeSet(String(target.reps))),
    })),
  };
}

export function validSet(set: SetEntry) {
  const weight = Number(set.weight);
  const reps = Number(set.reps);
  return set.weight.trim() !== '' && Number.isFinite(weight) && weight >= 0 && weight <= 1000
    && Number.isInteger(reps) && reps >= 1 && reps <= 200;
}

export function finishWorkout(draft: Draft, finishedAt = Date.now()): Workout | null {
  const lifts = draft.lifts.map((lift) => ({
    exerciseId: lift.exerciseId, sets: lift.sets.filter((set) => set.done && validSet(set)).map((set) => ({ ...set })),
  })).filter((lift) => lift.sets.length > 0);
  if (!lifts.length) return null;
  return { id: draft.id, name: draft.name, startedAt: draft.startedAt, finishedAt, lifts };
}

export function workoutStats(workout: Pick<Workout, 'lifts'>) {
  const sets = workout.lifts.flatMap((lift) => lift.sets).filter((set) => set.done);
  return { sets: sets.length, volume: sets.reduce((sum, set) => sum + Number(set.weight) * Number(set.reps), 0) };
}

export function progressFor(history: Workout[], id: ExerciseId) {
  return history.flatMap((workout) => {
    const sets = workout.lifts.find((lift) => lift.exerciseId === id)?.sets;
    if (!sets?.length) return [];
    return [{ date: workout.finishedAt, weight: Math.max(...sets.map((set) => Number(set.weight))) }];
  }).sort((a, b) => a.date - b.date);
}

export function previousSets(history: Workout[], id: ExerciseId) {
  return history.find((workout) => workout.lifts.some((lift) => lift.exerciseId === id))
    ?.lifts.find((lift) => lift.exerciseId === id)?.sets ?? [];
}

export function recordsFor(workout: Workout, history: Workout[]) {
  return workout.lifts.flatMap((lift) => {
    const previous = progressFor(history.filter((item) => item.finishedAt < workout.finishedAt), lift.exerciseId);
    const weight = Math.max(...lift.sets.map((set) => Number(set.weight)));
    return previous.length && weight > Math.max(...previous.map((point) => point.weight))
      ? [{ exerciseId: lift.exerciseId, weight }] : [];
  });
}

export function secondsLeft(until: number | null, now: number) {
  return until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
}

export function demoJournal(now = Date.now()): Journal {
  const upper: Routine = {
    id: 'upper-a', name: 'Upper Body A',
    targets: ['bench', 'row', 'press', 'pulldown'].map((id) => ({ exerciseId: id as ExerciseId, sets: 3, reps: 8 })),
  };
  const lower: Routine = {
    id: 'lower-a', name: 'Lower Body A',
    targets: ['squat', 'deadlift', 'split', 'leg-curl'].map((id) => ({ exerciseId: id as ExerciseId, sets: 3, reps: 8 })),
  };
  const calendar = [
    { days: 2, routine: upper, weights: [60, 55, 35, 50], minutes: 46 },
    { days: 4, routine: lower, weights: [85, 75, 20, 35], minutes: 51 },
    { days: 5, routine: upper, weights: [57.5, 55, 35, 47.5], minutes: 42 },
    { days: 8, routine: lower, weights: [82.5, 75, 20, 32.5], minutes: 48 },
    { days: 9, routine: upper, weights: [55, 52.5, 32.5, 45], minutes: 43 },
    { days: 13, routine: upper, weights: [55, 50, 32.5, 45], minutes: 45 },
    { days: 16, routine: lower, weights: [80, 70, 17.5, 30], minutes: 47 },
    { days: 18, routine: upper, weights: [52.5, 50, 30, 42.5], minutes: 41 },
    { days: 23, routine: upper, weights: [50, 47.5, 30, 40], minutes: 40 },
  ];
  const history = calendar.map(({ days, routine, weights, minutes }) => {
    const finishedAt = new Date(now);
    finishedAt.setDate(finishedAt.getDate() - days);
    finishedAt.setHours(18, 30, 0, 0);
    return {
      id: `sample-${days}`, name: routine.name, finishedAt: +finishedAt, startedAt: +finishedAt - minutes * 60000,
      lifts: routine.targets.map((target, index) => ({
        exerciseId: target.exerciseId,
        sets: Array.from({ length: target.sets }, (_, i) => ({
          id: `sample-${days}-${index}-${i}`, weight: String(weights[index]), reps: String(target.reps), done: true,
        })),
      })),
    };
  });
  return { routines: [upper, lower], history, draft: null };
}

export type Unit = 'kg' | 'lb';
const factor = 2.2046226218;
export const displayWeight = (kg: number, unit: Unit) => Math.round(kg * (unit === 'lb' ? factor : 1) * 100) / 100;
export const storedWeight = (value: string, unit: Unit) => value.trim() === '' ? '' : String(Math.round(Number(value) / (unit === 'lb' ? factor : 1) * 1e6) / 1e6);

export function repeatWorkout(workout: Workout, startedAt = Date.now()): Draft {
  return {
    id: crypto.randomUUID(), name: workout.name, startedAt, restUntil: null,
    lifts: workout.lifts.map(lift => ({ exerciseId: lift.exerciseId, sets: lift.sets.map(set => ({
      id: crypto.randomUUID(), weight: set.weight, reps: set.reps, done: false,
    })) })),
  };
}

export function filterWorkouts(history: Workout[], query = '', exerciseId: ExerciseId | '' = '', days = 0, now = Date.now()) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return history.filter(workout => {
    const text = `${workout.name} ${workout.lifts.map(lift => exercise(lift.exerciseId).name).join(' ')}`.toLowerCase();
    return terms.every(term => text.includes(term))
      && (!exerciseId || workout.lifts.some(lift => lift.exerciseId === exerciseId))
      && (!days || workout.finishedAt >= now - days * 86400000 && workout.finishedAt <= now);
  }).sort((a, b) => b.finishedAt - a.finishedAt);
}

export function fillPreviousWeights(lift: Lift, previous: SetEntry[]): Lift {
  return { ...lift, sets: lift.sets.map((set, index) => {
    const last = previous[index];
    if (set.done || set.weight.trim() !== '' || !last || !validSet(last)) return set;
    return { ...set, weight: last.weight, reps: set.reps.trim() === '' ? last.reps : set.reps };
  }) };
}

export function appendSet(lift: Lift): Lift {
  const last = [...lift.sets].reverse().find(validSet);
  return { ...lift, sets: [...lift.sets, { ...makeSet(last?.reps ?? lift.sets.at(-1)?.reps), weight: last?.weight ?? '' }] };
}

export const incompleteSets = (draft: Draft) => draft.lifts.flatMap(lift => lift.sets).filter(set => !set.done || !validSet(set));
