import {useState} from 'react';
import {useUnits} from './units.tsx';
import type {Page} from './navigation.ts';
import {demoJournal,exercise,library,progressMetric,progressFor,workoutStats,type ExerciseId,type Journal,type Routine,type Workout,type Workspace} from './training.ts';
import {Chart,Empty,duration,formatDate,Icon,number,PageHeading,WorkoutRows} from './ui.tsx';

export function Overview({ journal, start, open, navigate, newRoutine, workspace, usePersonal, canSwitch, addTemplate, onProgress }: {
  workspace: Workspace; onProgress: (id: ExerciseId) => void; usePersonal: () => void; canSwitch: boolean; addTemplate: (routine: Routine) => void;
  journal: Journal; start: (routine?: Routine) => void; open: (workout: Workout) => void; navigate: (page: Page) => void; newRoutine: () => void;
}) {
  const { unit, weight } = useUnits();
  const [chartExercise, setChartExercise] = useState<ExerciseId>(() => journal.history[0]?.lifts[0]?.exerciseId ?? journal.routines[0]?.targets[0]?.exerciseId ?? 'bench');
  const featured = journal.routines[0];
  const recent = journal.history[0];
  const month = Date.now() - 30 * 86400000;
  const lastMonth = journal.history.filter((workout) => workout.finishedAt >= month);
  const volume = lastMonth.reduce((sum, workout) => sum + workoutStats(workout).volume, 0);
  const metric = progressMetric(journal.history, chartExercise);
  const points = progressFor(journal.history, chartExercise);
  const current = points.at(-1)?.weight;
  return <>
    <PageHeading title="Training log" subtitle={formatDate(Date.now(), { weekday: 'long', month: 'long', day: 'numeric' })} action={<button className="button secondary blank" onClick={() => start()}><Icon name="plus" size={18} /> {journal.draft ? 'Resume workout' : 'Blank workout'}</button>} />
    {workspace === 'demo' && <section className="demo-notice" aria-label="About the demo journal"><div><span className="eyebrow">EXPLORE SETTRACK</span><strong>A sample journal. A place to try things.</strong><p>These workouts are examples. Your own training has a separate space on this device.</p></div><button className="button secondary" disabled={!canSwitch} onClick={usePersonal}>Use my journal <Icon name="chevron" size={16} /></button></section>}
    <section className="hero" aria-label="Start training"><div className="hero-content">
      <span className="eyebrow"><i />{journal.draft ? 'WORKOUT IN PROGRESS' : featured ? 'QUICK START' : 'START TRAINING'}</span>
      <h2>{journal.draft?.name ?? featured?.name ?? 'Your first workout'}</h2>
      <p>{featured && !journal.draft ? featured.targets.map((item) => exercise(item.exerciseId).group).filter((item, index, all) => all.indexOf(item) === index).join(' / ')
        : journal.draft ? `${workoutStats(journal.draft).sets} sets logged` : 'Log a free workout or build a routine.'}</p>
      <button className="button hero-button" onClick={() => start(featured)}><Icon name="weights" size={20} />{journal.draft ? 'Resume workout' : 'Start workout'}</button>
    </div></section>
    <div className="metrics">
      <Metric icon="calendar" label="Sessions" value={String(lastMonth.length)} note="Last 30 days" />
      <Metric icon="volume" label="Training volume" value={number(weight(volume))} unit={unit} note="Last 30 days" />
      <Metric icon="timer" label="Last session" value={recent ? duration(recent.startedAt, recent.finishedAt) : '—'} note={recent ? `${recent.name} · ${formatDate(recent.finishedAt)}` : 'Finish a workout to begin'} />
    </div>
    <div className="overview-grid">
      <section className="panel dashboard-chart"><div className="section-heading"><div><h2>{exercise(chartExercise).name}</h2><p>Heaviest set by session</p></div><button className="text-button" onClick={() => onProgress(chartExercise)}>View progress <Icon name="chevron" size={15} /></button></div>
        {current !== undefined && <div className="chart-value">{number(metric === 'weight' ? weight(current) : current)} <small>{metric === 'weight' ? unit : metric}</small>{points.length > 1 && points.at(-2)!.weight !== current && <span>{current > points.at(-2)!.weight ? '+' : '−'}{number(weight(Math.abs(current - points.at(-2)!.weight)))} {unit}</span>}</div>}
        <label className="field chart-select"><span className="sr-only">Overview exercise</span><select value={chartExercise} onChange={event => setChartExercise(event.target.value as ExerciseId)}>{library.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <Chart metric={metric} points={points} id={chartExercise} />
      </section>
      <section className="panel recent"><div className="section-heading"><h2>Recent workouts</h2><button className="text-button" onClick={() => navigate('history')}>View all <Icon name="chevron" size={15} /></button></div>
        {journal.history.length ? <WorkoutRows workouts={journal.history.slice(0, 4)} open={open} /> : <Empty title="No workouts logged">Your finished workouts will appear here.</Empty>}
      </section>
    </div>
    {workspace === 'personal' && !journal.routines.length && !journal.history.length && <section className="starter-section" aria-label="Starter routines"><div className="section-heading"><div><h2>Make your first session easier</h2><p>Start with an editable routine. No sample workouts will be added.</p></div></div><div className="starter-grid">{demoJournal().routines.map(routine => <article className="panel starter-card" key={routine.id}><span className="row-icon"><Icon name="weights" /></span><h3>{routine.name}</h3><p>{routine.targets.map(target => exercise(target.exerciseId).name).join(' · ')}</p><button className="button secondary" onClick={() => addTemplate(routine)}>Use {routine.name}</button></article>)}</div></section>}
    {!journal.routines.length && <button className="button secondary" onClick={newRoutine}><Icon name="plus" size={18} /> Create a routine</button>}
  </>;
}

function Metric({ icon, label, value, unit, note }: { icon: 'calendar' | 'volume' | 'timer'; label: string; value: string; unit?: string; note: string }) {
  return <article className="panel metric"><div><span>{label}</span><Icon name={icon} size={18} /></div><strong>{value} {unit && <small>{unit}</small>}</strong><span>{note}</span></article>;
}

