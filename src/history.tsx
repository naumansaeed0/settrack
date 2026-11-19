import { useState } from 'react';
import { filterWorkouts, library, type ExerciseId, type Workout } from './training.ts';
import { Empty, PageHeading, WorkoutRows } from './ui.tsx';

export function WorkoutHistory({ history, open }: { history: Workout[]; open: (workout: Workout) => void }) {
  const [query, setQuery] = useState('');
  const [lift, setLift] = useState<ExerciseId | ''>('');
  const [days, setDays] = useState('0');
  const matches = filterWorkouts(history, query, lift, Number(days));
  const filtered = query !== '' || lift !== '' || days !== '0';
  const clear = () => { setQuery(''); setLift(''); setDays('0'); };
  return <>
    <PageHeading title="Workout history" subtitle={`${history.length} completed ${history.length === 1 ? 'workout' : 'workouts'}`} />
    {history.length > 0 && <section className="history-filters" aria-label="Filter workout history">
      <label className="field search-field">Search workouts<input type="search" value={query} placeholder="Workout or exercise name" onChange={e => setQuery(e.target.value)} /></label>
      <label className="field">Exercise<select value={lift} onChange={e => setLift(e.target.value as ExerciseId | '')}><option value="">All exercises</option>{library.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label className="field">Period<select value={days} onChange={e => setDays(e.target.value)}><option value="0">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
    </section>}
    {filtered && <div className="filter-summary"><p aria-live="polite">Showing {matches.length} of {history.length} workouts</p><button className="text-button" onClick={clear}>Clear filters</button></div>}
    <section className="panel">{matches.length > 0 ? <WorkoutRows workouts={matches} open={open} /> : history.length > 0 ? <Empty title="No workouts match">Try another search or clear your filters.</Empty> : <Empty title="The log is empty">Finish your first workout to see it here.</Empty>}</section>
  </>;
}
