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
  { id: 'pull-up', name: 'Pull-up', group: 'Back' },
  { id: 'dip', name: 'Dip', group: 'Chest' },
  { id: 'plank', name: 'Plank', group: 'Core' },
  { id: 'push-up', name: 'Push-up', group: 'Chest' },
] as const;

export type ExerciseId = (typeof library)[number]['id'];
export const exercise = (id: ExerciseId) => library.find((item) => item.id === id)!;

export type ExerciseType = 'weight' | 'bodyweight' | 'timed';
export const exerciseType = (lift: { exerciseId: ExerciseId; type?: ExerciseType }): ExerciseType => lift.type ?? (lift.exerciseId === 'plank' ? 'timed' : ['pull-up', 'dip'].includes(lift.exerciseId) ? 'bodyweight' : 'weight');
export type Target = { type?: ExerciseType; exerciseId: ExerciseId; sets: number; reps: number };
export type Routine = { id: string; name: string; targets: Target[] };
export type SetEntry = { id: string; weight: string; reps: string; done: boolean; seconds?: string; enteredWeight?: { unit: Unit; value: string } };
export type Lift = { type?: ExerciseType; exerciseId: ExerciseId; sets: SetEntry[] };
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
    id: crypto.randomUUID(), name: routine?.name ?? 'Blank workout', startedAt, restUntil: null,
    lifts: (routine?.targets ?? []).map((target) => ({
      exerciseId: target.exerciseId, type: exerciseType(target),
      sets: Array.from({ length: target.sets }, () => ({ ...makeSet(exerciseType(target) === 'timed' ? '' : String(target.reps)), ...(exerciseType(target) === 'timed' ? { seconds: String(target.reps) } : {}) })),
    })),
  };
}

export function validSet(set: SetEntry, type: ExerciseType = 'weight') {
  if (type !== 'weight' && set.weight.trim() !== '' && Number(set.weight) !== 0) return false;
  if (type === 'timed') return !!set.seconds?.trim() && Number.isInteger(Number(set.seconds)) && Number(set.seconds) > 0 && Number(set.seconds) <= 86400;
  if (type === 'bodyweight') return Number.isInteger(Number(set.reps)) && Number(set.reps) >= 1 && Number(set.reps) <= 200;
  const weight = Number(set.weight);
  const reps = Number(set.reps);
  return set.weight.trim() !== '' && Number.isFinite(weight) && weight >= 0 && weight <= 1000
    && Number.isInteger(reps) && reps >= 1 && reps <= 200;
}

export function finishWorkout(draft: Draft, finishedAt = Date.now()): Workout | null {
  const lifts = draft.lifts.map((lift) => ({
    exerciseId: lift.exerciseId, type: exerciseType(lift), sets: lift.sets.filter((set) => set.done && validSet(set, exerciseType(lift))).map((set) => ({ ...set })),
  })).filter((lift) => lift.sets.length > 0);
  if (!lifts.length) return null;
  return { id: draft.id, name: draft.name, startedAt: draft.startedAt, finishedAt, lifts };
}

export function workoutStats(workout: Pick<Workout, 'lifts'>) {
  const sets = workout.lifts.flatMap(lift => lift.sets.filter(set => set.done && validSet(set,exerciseType(lift))));
  return { sets: sets.length, volume: sets.reduce((sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0), 0) };
}

export type ProgressMetric = 'weight' | 'reps' | 'seconds';
export function progressMetric(history: Workout[], id: ExerciseId): ProgressMetric {
  const lift = [...history].sort((a,b) => b.finishedAt - a.finishedAt).find(w => w.lifts.some(l => l.exerciseId === id))?.lifts.find(l => l.exerciseId === id);
  if (!lift) return exerciseType({ exerciseId: id }) === 'timed' ? 'seconds' : ['pull-up','dip','push-up'].includes(id) ? 'reps' : 'weight';
  return exerciseType(lift) === 'timed' ? 'seconds' : exerciseType(lift) === 'bodyweight' || lift.sets.every(s => Number(s.weight) === 0) ? 'reps' : 'weight';
}
export function progressFor(history: Workout[], id: ExerciseId, metric = progressMetric(history, id)) {
  return history.flatMap(workout => {
    const lift = workout.lifts.find(l => l.exerciseId === id);
    if (!lift?.sets.length) return [];
    if (metric === 'seconds' && exerciseType(lift) !== 'timed' || metric !== 'seconds' && exerciseType(lift) === 'timed') return [];
    return [{ date: workout.finishedAt, weight: Math.max(...lift.sets.filter(s => s.done && validSet(s, exerciseType(lift))).map(s => Number(metric === 'seconds' ? s.seconds : metric === 'reps' ? s.reps : s.weight))) }].filter(p => Number.isFinite(p.weight));
  }).sort((a,b) => a.date - b.date);
}

export function previousSets(history: Workout[], id: ExerciseId) {
  return history.find((workout) => workout.lifts.some((lift) => lift.exerciseId === id))
    ?.lifts.find((lift) => lift.exerciseId === id)?.sets ?? [];
}

export function recordsFor(workout: Workout, history: Workout[]) {
  return workout.lifts.flatMap((lift) => {
    const metric = progressMetric([workout], lift.exerciseId);
    const previous = progressFor(history.filter((item) => item.finishedAt < workout.finishedAt), lift.exerciseId, metric);
    const weight = Math.max(...lift.sets.map((set) => Number(metric === 'seconds' ? set.seconds : metric === 'reps' ? set.reps : set.weight)));
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
export const storedWeight = (value: string, unit: Unit) => value.trim() === '' ? '' : Number.isFinite(Number(value)) ? String(Math.round(Number(value) / (unit === 'lb' ? factor : 1) * 1e9) / 1e9) : '';

export function repeatWorkout(workout: Workout, startedAt = Date.now()): Draft {
  return {
    id: crypto.randomUUID(), name: workout.name, startedAt, restUntil: null,
    lifts: workout.lifts.map(lift => ({ exerciseId: lift.exerciseId, type: exerciseType(lift), sets: lift.sets.map(set => ({
      id: crypto.randomUUID(), weight: set.weight, reps: set.reps, seconds: set.seconds, done: false,
    })) })),
  };
}

export function filterWorkouts(history: Workout[], query = '', exerciseId: ExerciseId | '' = '', days = 0, now = Date.now()) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return history.filter(workout => {
    const text = `${workout.name} ${workout.lifts.map(lift => exercise(lift.exerciseId).name).join(' ')}`.toLowerCase();
    return terms.every(term => text.includes(term))
      && (!exerciseId || workout.lifts.some(lift => lift.exerciseId === exerciseId))
      && (!days || workout.finishedAt >= localDayStart(now, days - 1) && workout.finishedAt <= now);
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
  const last = [...lift.sets].reverse().find(set => validSet(set, exerciseType(lift)));
  return { ...lift, sets: [...lift.sets, { ...makeSet(last?.reps ?? lift.sets.at(-1)?.reps), weight: last?.weight ?? '', ...(last?.seconds ? { seconds: last.seconds } : {}) }] };
}

export const incompleteSets = (draft: Draft) => draft.lifts.flatMap(lift => lift.sets.filter(set => !set.done || !validSet(set, exerciseType(lift))));

export function localDayStart(now: number, daysAgo = 0) { const date = new Date(now); date.setDate(date.getDate() - daysAgo); date.setHours(0,0,0,0); return +date; }
export function migrateJournal(journal: Journal): Journal {
  const next = structuredClone(journal);
  next.routines.forEach(r => r.targets.forEach(t => { t.type ??= exerciseType(t); }));
  [...next.history, ...(next.draft ? [next.draft] : [])].forEach(w => w.lifts.forEach(l => { l.type ??= exerciseType(l); }));
  return next;
}

export function currentRecords(history: Workout[]) {
 return library.flatMap(item=>{const metric=progressMetric(history,item.id);const points=progressFor(history,item.id,metric);return points.length?[{exerciseId:item.id,metric,value:Math.max(...points.map(p=>p.weight))}]:[];});
}
export function trainingSummary(history: Workout[], now = Date.now()) {
 const weekStart=localDayStart(now,6);const recent=history.filter(w=>w.finishedAt>=weekStart&&w.finishedAt<=now);
 const monday=(time:number)=>{const d=new Date(time);d.setDate(d.getDate()-((d.getDay()+6)%7));d.setHours(0,0,0,0);return +d;};
 const weeks=new Set(history.map(w=>monday(w.finishedAt)));let cursor=monday(now);if(!weeks.has(cursor)){const d=new Date(cursor);d.setDate(d.getDate()-7);cursor=+d;}let streak=0;
 while(weeks.has(cursor)){streak++;const d=new Date(cursor);d.setDate(d.getDate()-7);cursor=+d;}
 return {sessions:recent.length,volume:recent.reduce((sum,w)=>sum+workoutStats(w).volume,0),sets:recent.reduce((sum,w)=>sum+workoutStats(w).sets,0),streak,records:currentRecords(history)};
}

export function stepSet(set: SetEntry, field: 'weight'|'reps'|'seconds', delta: number, unit: Unit = 'kg'): Partial<SetEntry> {
 if(field==='weight') { const shown=set.enteredWeight?.unit===unit?Number(set.enteredWeight.value):displayWeight(Number(set.weight||0),unit);const maximum=unit==='lb'?1000*factor:1000;const next=Math.min(maximum,Math.max(0,(Number.isFinite(shown)?shown:0)+delta));return {weight:String(Math.min(1000,Number(storedWeight(String(next),unit)))),enteredWeight:{unit,value:String(Math.round(next*100)/100)},done:false}; }
 return {[field]:String(Math.min(field==='seconds'?86400:200,Math.max(1,Number(set[field]||0)+delta))),done:false};
}
