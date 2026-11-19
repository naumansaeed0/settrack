import { useEffect, useState } from 'react';
import { exercise, library, makeSet, previousSets, secondsLeft, validSet, workoutStats, recordsFor,
  type Workspace, type Draft, type ExerciseId, type Journal, type Routine, type SetEntry, type Workout } from './training.ts';
import { duration, Empty, formatDate, Icon, Modal, number, PageHeading } from './ui.tsx';

export function WorkoutEditor({ draft, history, change, finish, discard, workspace }: {
  workspace: Workspace; draft: Draft; history: Workout[]; change: (draft: Draft) => void; finish: () => void; discard: () => void;
}) {
  const [restSeconds, setRestSeconds] = useState(() => { try { return localStorage.getItem(`settrack:${workspace}:restSeconds`) || '90'; } catch { return '90'; } });
  const durationSeconds = Math.min(3600, Math.max(5, Number(restSeconds) || 90));
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null);
  const [now, setNow] = useState(Date.now);
  const count = workoutStats(draft).sets;
  const total = draft.lifts.reduce((sum, lift) => sum + lift.sets.length, 0);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);
  const remaining = secondsLeft(draft.restUntil, now);
  const timer = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;

  function updateSet(liftId: ExerciseId, id: string, patch: Partial<SetEntry>, startRest = false) {
    change({ ...draft, restUntil: startRest ? Date.now() + durationSeconds * 1000 : draft.restUntil, lifts: draft.lifts.map((lift) =>
      lift.exerciseId === liftId ? { ...lift, sets: lift.sets.map((set) => set.id === id ? { ...set, ...patch } : set) } : lift) });
  }

  return <>
    <PageHeading title={draft.name} subtitle={`${count} of ${total} sets completed · ${duration(draft.startedAt, now)} elapsed`} />
    <div className="session-grid">
      <div className="lift-list">
        {!draft.lifts.length && <section className="panel"><Empty title="What are you lifting today?">Add an exercise to log your first set.</Empty></section>}
        {draft.lifts.map((lift) => {
          const info = exercise(lift.exerciseId);
          const previous = previousSets(history, lift.exerciseId);
          const latest = previous.at(-1);
          return <section className="panel lift" key={lift.exerciseId} aria-label={info.name}>
            <header className="lift-heading"><span className="row-icon"><Icon name="weights" /></span><div><h2>{info.name}</h2><p>{info.group}{latest && ` · Last session ${latest.weight} kg × ${latest.reps}`}</p></div></header>
            <div className="set-grid set-labels" aria-hidden="true"><span>Set</span><span>Previous</span><span>kg</span><span>Reps</span><span>Done</span></div>
            {lift.sets.map((set, index) => <div className={`set-grid set-row ${set.done ? 'done' : ''}`} key={set.id}>
              <span>{index + 1}</span><span className="previous">{previous[index] ? `${previous[index].weight} × ${previous[index].reps}` : '—'}</span>
              <input inputMode="decimal" type="number" min="0" max="1000" step="any" placeholder={previous[index]?.weight ?? '0'} aria-label={`${info.name} set ${index + 1} weight in kg`} value={set.weight} onChange={(event) => updateSet(lift.exerciseId, set.id, { weight: event.target.value, done: false })} />
              <input inputMode="numeric" type="number" min="1" max="200" step="1" placeholder={previous[index]?.reps ?? '–'} aria-label={`${info.name} set ${index + 1} reps`} value={set.reps} onChange={(event) => updateSet(lift.exerciseId, set.id, { reps: event.target.value, done: false })} />
              <button type="button" className="icon-button set-check" aria-label={`${info.name} set ${index + 1} ${set.done ? 'undo' : 'complete'}`} aria-pressed={set.done} disabled={!validSet(set)} onClick={() => updateSet(lift.exerciseId, set.id, { done: !set.done }, !set.done)}><Icon name="check" size={18} /></button>
            </div>)}
            <button className="text-button add-set" onClick={() => change({ ...draft, lifts: draft.lifts.map((item) => item === lift ? { ...lift, sets: [...lift.sets, makeSet(lift.sets.at(-1)?.reps)] } : item) })}><Icon name="plus" size={16} /> Add set</button>
          </section>;
        })}
        <button className="button secondary add-exercise" onClick={() => setAdding(true)}><Icon name="plus" size={18} /> Add exercise</button>
      </div>
      <aside className="panel timer-panel" aria-label="Rest timer and workout actions">
        <div className="timer-content"><div className="timer-label"><Icon name="timer" /><span>Rest timer</span></div><div className="timer-number" role="timer" aria-label={`${remaining} seconds remaining`}>{timer}</div></div>
        <label className="rest-setting">Rest seconds<input aria-label="Rest duration in seconds" inputMode="numeric" type="number" min="5" max="3600" step="1" value={restSeconds} onChange={event => { setRestSeconds(event.target.value); try { localStorage.setItem(`settrack:${workspace}:restSeconds`, event.target.value); } catch { /* Session-only preference. */ } }} /></label>
        <div className="timer-actions"><button className="button secondary" onClick={() => { const start = Date.now(); setNow(start); change({ ...draft, restUntil: start + durationSeconds * 1000 }); }}>{remaining ? 'Restart' : `Start ${durationSeconds}s`}</button><button className="button secondary" disabled={!remaining} onClick={() => change({ ...draft, restUntil: null })}>Skip</button></div>
        <div className="session-actions"><button className="button primary" disabled={!count} onClick={() => count === total ? finish() : setConfirm('finish')}>Finish workout</button><button className="text-button discard" onClick={() => setConfirm('discard')}>Discard draft</button></div>
      </aside>
    </div>
    {adding && <ExercisePicker used={draft.lifts.map((lift) => lift.exerciseId)} onClose={() => setAdding(false)} onSelect={(id) => {
      change({ ...draft, lifts: [...draft.lifts, { exerciseId: id, sets: [makeSet()] }] }); setAdding(false);
    }} />}
    {confirm && <Modal title={confirm === 'finish' ? 'Finish workout?' : 'Discard this draft?'} onClose={() => setConfirm(null)}>
      <p>{confirm === 'finish' ? `Your ${count} completed ${count === 1 ? 'set will' : 'sets will'} be saved to History.` : 'The sets in this draft will be cleared.'}</p>
      <div className="modal-actions"><button className="button secondary" onClick={() => setConfirm(null)}>Keep logging</button><button className={`button ${confirm === 'finish' ? 'primary' : 'danger'}`} onClick={confirm === 'finish' ? finish : discard}>{confirm === 'finish' ? 'Save workout' : 'Discard draft'}</button></div>
    </Modal>}
  </>;
}

function ExercisePicker({ used, onClose, onSelect }: { used: ExerciseId[]; onClose: () => void; onSelect: (id: ExerciseId) => void }) {
  const [query, setQuery] = useState('');
  const matches = library.filter((item) => !used.includes(item.id) && `${item.name} ${item.group}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <Modal title="Add an exercise" onClose={onClose}>
    <input className="search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercises" aria-label="Search exercises" autoFocus />
    <div className="picker">{matches.map((item) => <button className="picker-row" key={item.id} onClick={() => onSelect(item.id)}><span><strong>{item.name}</strong><small>{item.group}</small></span><Icon name="plus" size={18} /></button>)}</div>
    {!matches.length && <p>No available exercises match this search.</p>}
  </Modal>;
}

export function RoutineEditor({ initial, onSave, onClose }: { initial?: Routine; onSave: (routine: Routine) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [targets, setTargets] = useState(initial?.targets ?? []);
  const [selected, setSelected] = useState<ExerciseId | ''>('');
  const valid = name.trim().length > 0 && targets.length > 0;
  function move(index: number, offset: number) {
    const order = [...targets];
    [order[index], order[index + offset]] = [order[index + offset], order[index]];
    setTargets(order);
  }
  return <Modal title={initial ? 'Edit routine' : 'New routine'} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); if (valid) onSave({ id: initial?.id ?? crypto.randomUUID(), name: name.trim(), targets }); }}>
      <label className="field">Routine name<input value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={60} required /></label>
      {!!targets.length && <div className="routine-targets">{targets.map((target, index) => <div className="routine-target" key={target.exerciseId}>
        <strong>{exercise(target.exerciseId).name}</strong>
        <label>Sets<input type="number" min="1" max="20" step="1" required value={target.sets || ''} onChange={(event) => {
          const sets = Number(event.target.value); setTargets(targets.map((item) => item === target ? { ...target, sets } : item));
        }} /></label>
        <label>Reps<input type="number" min="1" max="200" step="1" required value={target.reps || ''} onChange={(event) => {
          const reps = Number(event.target.value); setTargets(targets.map((item) => item === target ? { ...target, reps } : item));
        }} /></label>
        <div className="target-actions"><button type="button" className="icon-button subtle" disabled={index === 0} aria-label={`Move ${exercise(target.exerciseId).name} up`} onClick={() => move(index, -1)}><Icon name="up" size={16} /></button><button type="button" className="icon-button subtle" disabled={index === targets.length - 1} aria-label={`Move ${exercise(target.exerciseId).name} down`} onClick={() => move(index, 1)}><Icon name="down" size={16} /></button><button type="button" className="icon-button subtle" aria-label={`Remove ${exercise(target.exerciseId).name}`} onClick={() => setTargets(targets.filter((item) => item !== target))}><Icon name="close" size={16} /></button></div>
      </div>)}</div>}
      <div className="routine-add"><label className="field">Exercise<select value={selected} onChange={(event) => setSelected(event.target.value as ExerciseId | '')}><option value="">Choose an exercise</option>{library.filter((item) => targets.every((target) => target.exerciseId !== item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" className="button secondary" disabled={!selected} onClick={() => { if (selected) setTargets([...targets, { exerciseId: selected, sets: 3, reps: 8 }]); setSelected(''); }}>Add</button></div>
      <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={!valid}>Save routine</button></div>
    </form>
  </Modal>;
}

export function WorkoutDetail({ workout, journal, onClose, onProgress, onSave, onDelete }: { workout: Workout; journal: Journal; onClose: () => void; onProgress: (id: ExerciseId) => void; onSave: (workout: Workout) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [edited, setEdited] = useState(workout);
  const stats = workoutStats(workout);
  const records = recordsFor(workout, journal.history);
  return <Modal title={workout.name} onClose={onClose}>
    {confirmDelete ? <><p>Delete this workout and all its sets? Export a backup first if you want to keep a copy.</p><div className="modal-actions"><button className="button secondary" onClick={() => setConfirmDelete(false)}>Keep workout</button><button className="button danger" onClick={onDelete}>Confirm delete workout</button></div></> : editing ? <form onSubmit={(event) => { event.preventDefault(); onSave({ ...edited, lifts: edited.lifts.filter(lift => lift.sets.length) }); setEditing(false); }}>
      <label className="field">Workout name<input required maxLength={60} value={edited.name} onChange={e => setEdited({ ...edited, name: e.target.value })} /></label>
      <label className="field">Finished at<input type="datetime-local" required value={new Date(edited.finishedAt - new Date(edited.finishedAt).getTimezoneOffset() * 60000).toISOString().slice(0,16)} onChange={e => { const end = +new Date(e.target.value); if (Number.isFinite(end)) setEdited({ ...edited, finishedAt: end, startedAt: end - (edited.finishedAt - edited.startedAt) }); }} /></label>
      {edited.lifts.map(lift => <fieldset key={lift.exerciseId}><legend>{exercise(lift.exerciseId).name}</legend>{lift.sets.map((set, index) => <div className="edit-set" key={set.id}>
        <label>Set {index + 1} kg<input type="number" inputMode="decimal" required min="0" max="1000" step="any" value={set.weight} onChange={e => setEdited({ ...edited, lifts: edited.lifts.map(l => l === lift ? { ...l, sets: l.sets.map(s => s === set ? { ...s, weight: e.target.value } : s) } : l) })} /></label>
        <label>Reps<input type="number" inputMode="numeric" required min="1" max="200" value={set.reps} onChange={e => setEdited({ ...edited, lifts: edited.lifts.map(l => l === lift ? { ...l, sets: l.sets.map(s => s === set ? { ...s, reps: e.target.value } : s) } : l) })} /></label>
        <button type="button" className="button secondary" aria-label={`Delete ${exercise(lift.exerciseId).name} set ${index + 1}`} onClick={() => { if (window.confirm('Delete this completed set? Changes take effect when you save the workout.')) setEdited({ ...edited, lifts: edited.lifts.map(l => l === lift ? { ...l, sets: l.sets.filter(s => s !== set) } : l) }); }}>Delete set</button>
      </div>)}</fieldset>)}
      <div className="modal-actions"><button type="button" className="button secondary" onClick={() => { setEdited(workout); setEditing(false); }}>Cancel changes</button><button className="button primary" disabled={!edited.name.trim() || !edited.lifts.some(l => l.sets.length) || edited.lifts.some(l => l.sets.some(s => !validSet(s))) || edited.startedAt < 0}>Save changes</button></div>
    </form> : <>
    <p className="summary-date">{formatDate(workout.finishedAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <div className="summary-stats"><div><strong>{stats.sets}</strong><small>Sets</small></div><div><strong>{number(stats.volume)} kg</strong><small>Volume</small></div><div><strong>{duration(workout.startedAt, workout.finishedAt)}</strong><small>Duration</small></div></div>
    {records.map((record) => <div className="record" key={record.exerciseId}><Icon name="trophy" /><div><strong>New heaviest set</strong><p>{exercise(record.exerciseId).name} · {number(record.weight)} kg</p></div><button className="text-button" onClick={() => onProgress(record.exerciseId)}>View progress</button></div>)}
    <div className="summary-lifts">{workout.lifts.map((lift) => <div key={lift.exerciseId}><strong>{exercise(lift.exerciseId).name}</strong><span>{lift.sets.map((set) => `${set.weight} kg × ${set.reps}`).join(' · ')}</span></div>)}</div>
    <div className="modal-actions"><button className="button secondary" onClick={() => setEditing(true)}>Edit workout</button><button className="button danger" onClick={() => setConfirmDelete(true)}>Delete workout</button><button className="button primary" onClick={onClose}>Done</button></div>
    </>}
  </Modal>;
}
