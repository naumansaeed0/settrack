import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import { exportBackup, importBackup } from './backup.ts';
import { loadJournal, saveJournal } from './journal.ts';
import { demoJournal, emptyJournal, exercise, finishWorkout, library, progressFor, startWorkout, workoutStats,
  type ExerciseId, type Journal, type Routine, type Workout, type Workspace } from './training.ts';
import { Chart, duration, Empty, formatDate, Icon, Modal, number, PageHeading, WorkoutRows } from './ui.tsx';
import { RoutineEditor, WorkoutDetail, WorkoutEditor } from './workout.tsx';
import './styles.css';

type Page = 'dashboard' | 'routines' | 'history' | 'progress' | 'workout';
function routePage(): Page {
  const value = location.hash.slice(1);
  return ['dashboard', 'routines', 'history', 'progress', 'workout'].includes(value) ? value as Page : 'dashboard';
}
const navigation = [{ id: 'dashboard', label: 'Overview' }, { id: 'routines', label: 'Routines' }, { id: 'history', label: 'History' }, { id: 'progress', label: 'Progress' }] as const;

function initialWorkspace(): Workspace {
  return new URLSearchParams(location.search).get('workspace') === 'personal' ? 'personal' : 'demo';
}

function App() {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [switcher, setSwitcher] = useState(false);
  return <>
    <JournalApp key={workspace} workspace={workspace} openSwitcher={() => setSwitcher(true)} />
    {switcher && <Modal title="Switch workspace" onClose={() => setSwitcher(false)}>
      <p>Each workspace keeps its own routines and workout history on this device.</p>
      <div className="picker">{(['demo', 'personal'] as const).map((option) => <button className="picker-row" key={option} onClick={() => {
        const url = new URL(location.href);
        if (option === 'demo') url.searchParams.delete('workspace'); else url.searchParams.set('workspace', option);
        window.history.replaceState(null, '', url);
        setWorkspace(option);
        setSwitcher(false);
      }}><span><strong>{option === 'demo' ? 'Demo journal' : 'My journal'}</strong><small>{option === 'demo' ? 'Sample routines and lifting history' : 'Your own routines and workouts'}</small></span><Icon name={workspace === option ? 'check' : 'chevron'} size={18} /></button>)}</div>
    </Modal>}
  </>;
}

function JournalApp({ workspace, openSwitcher }: { workspace: Workspace; openSwitcher: () => void }) {
  const [journal, setJournal] = useState<Journal | null>(null);
  const [page, setPage] = useState<Page>(() => routePage());
  const [selected, setSelected] = useState<ExerciseId>('bench');
  const [editing, setEditing] = useState<Routine | 'new' | null>(null);
  const [detail, setDetail] = useState<Workout | null>(null);
  const [status, setStatus] = useState<'ready' | 'saving' | 'error'>('ready');
  const [storageError, setStorageError] = useState('');
  const [persistence, setPersistence] = useState('');
  const [backupError, setBackupError] = useState('');
  const [imported, setImported] = useState<Journal | null>(null);
  const pending = useRef(Promise.resolve());
  const lastSave = useRef(0);
  const version = useRef(0);
  const focusAfterNavigation = useRef(false);
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    if (navigator.storage?.persist) {
      void navigator.storage.persist().then(granted => { if (active) setPersistence(granted ? 'Persistent storage enabled.' : 'Your browser may clear this journal under storage pressure. Export backups regularly.'); }).catch(() => { if (active) setPersistence('Persistent storage is unavailable. Export backups regularly.'); });
    } else setPersistence('Persistent storage is unavailable. Export backups regularly.');
    loadJournal(workspace).then((saved) => {
      if (active) {
        version.current = saved?.revision ?? 0;
        setJournal(saved?.journal ?? (workspace === 'demo' ? demoJournal() : emptyJournal()));
      }
    }).catch(() => { if (active) setStorageError('IndexedDB is unavailable. Private browsing, blocked site storage or a full device may prevent saving. Allow site storage, free space and reload.'); });
    return () => { active = false; };
  }, [workspace]);

  useEffect(() => {
    if (focusAfterNavigation.current) main.current?.focus();
  }, [page]);

  useEffect(() => {
    const sync = () => setPage(routePage());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  function navigate(next: Page) {
    if (next === page) return;
    focusAfterNavigation.current = true;
    setPage(next);
    location.hash = next;
    window.scrollTo(0, 0);
  }

  function save(next: Journal) {
    if (storageError) return;
    setJournal(next);
    setStatus('saving');
    const ticket = ++lastSave.current;
    const write = pending.current.then(async () => { version.current = await saveJournal(workspace, next, version.current); });
    pending.current = write;
    write.then(() => { if (ticket === lastSave.current) setStatus('ready'); }, (error: unknown) => {
      if (ticket === lastSave.current) {
        setStatus('error');
        setStorageError(error instanceof Error && error.message === 'workspace-conflict'
          ? 'This journal changed in another tab. Reload to see the saved version.'
          : 'This change could not be saved to IndexedDB (storage blocked or quota exceeded). Export your journal now, then free storage and reload.');
      }
    });
  }

  function start(routine?: Routine) {
    if (!journal) return;
    if (!journal.draft) save({ ...journal, draft: startWorkout(routine) });
    navigate('workout');
  }

  function finish() {
    if (!journal?.draft) return;
    const result = finishWorkout(journal.draft);
    if (!result) return;
    save({ ...journal, draft: null, history: [result, ...journal.history] });
    navigate('history');
    setDetail(result);
  }

  const points = journal ? progressFor(journal.history, selected) : [];
  const newRoutine = <button className="button primary" onClick={() => setEditing('new')}><Icon name="plus" size={18} /> New routine</button>;

  return <div className="shell">
    <a className="skip" href="#content">Skip to content</a>
    <aside className="sidebar">
      <a className="brand" href="./" onClick={(event) => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate('dashboard'); }}><img src={`${import.meta.env.BASE_URL}mark.svg`} width="39" height="39" alt="" /><span>SetTrack<small>Training journal</small></span></a>
      <nav aria-label="Journal">{navigation.map(({ id, label }) => <button key={id} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon name={id} /> <span>{label}</span></button>)}
        {journal?.draft && <button className={page === 'workout' ? 'active workout-nav' : 'workout-nav'} aria-current={page === 'workout' ? 'page' : undefined} onClick={() => navigate('workout')}><Icon name="weights" /> <span>Workout</span></button>}
      </nav>
      <button className="workspace" onClick={openSwitcher} disabled={status === 'saving'}><span className="workspace-icon"><Icon name="workspace" size={18} /></span><span><strong>{workspace === 'demo' ? 'Demo journal' : 'My journal'}</strong><small>Switch workspace</small></span><Icon name="chevron" size={15} /></button>
    </aside>
    <div className="body">
      <header className="topbar"><span>{page === 'workout' ? 'Active workout' : navigation.find((item) => item.id === page)?.label}</span><div role="status" className="storage-status"><i data-status={status} />{status === 'saving' ? 'Saving…' : status === 'error' ? 'Save failed' : journal ? 'Stored on this device' : 'Opening journal…'}</div></header>
      <main id="content" ref={main} tabIndex={-1}>
        {storageError && <p className="error" role="alert">{storageError} <button className="text-button" onClick={() => location.reload()}>Reload</button></p>}
        {!journal && !storageError && <p>Opening your journal…</p>}
        <div inert={!!storageError}>
          {journal && page === 'dashboard' && <Overview journal={journal} start={start} open={setDetail} navigate={navigate} newRoutine={() => setEditing('new')} />}
          {journal && page === 'routines' && <><PageHeading title="Routines" subtitle="Build a workout you can return to." action={newRoutine} />
            {journal.routines.length ? <div className="routine-cards">{journal.routines.map((routine) => <article className="panel routine-card" key={routine.id}><span className="row-icon"><Icon name="weights" /></span><h2>{routine.name}</h2><p>{routine.targets.length} exercises · {routine.targets.reduce((sum, item) => sum + item.sets, 0)} target sets</p><ul>{routine.targets.map((target) => <li key={target.exerciseId}>{exercise(target.exerciseId).name}<span>{target.sets} × {target.reps}</span></li>)}</ul><div className="routine-actions"><button className="button primary" onClick={() => start(routine)}>{journal.draft ? 'Resume workout' : 'Start workout'}</button><button className="button secondary" onClick={() => setEditing(routine)} aria-label={`Edit ${routine.name}`}>Edit</button></div></article>)}</div>
              : <section className="panel"><Empty title="No routines yet">Create a routine with the exercises you train most often.</Empty></section>}</>}
          {journal && page === 'history' && <><PageHeading title="Workout history" subtitle={`${journal.history.length} completed ${journal.history.length === 1 ? 'workout' : 'workouts'}`} />
            <section className="panel">{journal.history.length ? <WorkoutRows workouts={journal.history} open={setDetail} /> : <Empty title="The log is empty">Finish your first workout to see it here.</Empty>}</section></>}
          {journal && page === 'progress' && <><PageHeading title="Lift progress" subtitle="Follow your heaviest completed set from session to session." />
            <section className="panel progress-panel"><div className="section-heading"><h2>{exercise(selected).name}</h2><label className="field"><span className="sr-only">Exercise</span><select value={selected} onChange={(event) => setSelected(event.target.value as ExerciseId)}>{library.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
              {points.length > 0 && <div className="progress-metrics"><div><small>Heaviest set</small><strong>{number(Math.max(...points.map((point) => point.weight)))} <small>kg</small></strong></div><div><small>Sessions</small><strong>{points.length}</strong></div></div>}
              <Chart points={points} id={selected} />
              {points.length > 0 && <details><summary>Session data</summary><table className="data-table"><thead><tr><th scope="col">Date</th><th scope="col">Heaviest set</th></tr></thead><tbody>{[...points].reverse().map((point, index) => <tr key={`${point.date}-${index}`}><td>{formatDate(point.date, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>{number(point.weight)} kg</td></tr>)}</tbody></table></details>}
            </section></>}
          {journal?.draft && page === 'workout' && <WorkoutEditor draft={journal.draft} history={journal.history} change={(draft) => save({ ...journal, draft })} finish={finish} discard={() => { save({ ...journal, draft: null }); navigate('dashboard'); }} />}
        </div>
      </main>
      <footer><span>SetTrack</span><div className="backup-actions">
        <button className="text-button" disabled={!journal || status === 'saving'} onClick={() => {
          if (!journal) return;
          const url = URL.createObjectURL(new Blob([exportBackup(journal)], { type: 'application/json' }));
          const link = document.createElement('a'); link.href = url; link.download = `settrack-${workspace}-${new Date().toISOString().slice(0, 10)}.json`; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}>Export journal</button>
        <label className="button secondary">Import journal<input aria-label="Import journal" type="file" accept=".json,application/json" disabled={!journal || !!storageError || status === 'saving'} onChange={async (event) => {
          const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
          setBackupError('');
          try { if (file.size > 20 * 1024 * 1024) throw new Error('Backup is too large (maximum 20 MB).'); setImported(importBackup(await file.text())); }
          catch (error) { setBackupError(error instanceof Error ? error.message : 'Could not read backup file.'); }
        }} /></label></div><span>Strength training journal</span></footer>
    </div>
    {persistence && <p className="storage-note">{persistence}</p>}
    {backupError && <p className="error" role="alert">{backupError}</p>}
    {imported && <Modal title="Replace this journal?" onClose={() => setImported(null)}><p>This will replace all routines, past workouts and the active draft in {workspace === 'demo' ? 'Demo journal' : 'My journal'} with the backup. Export your current journal first to keep a copy.</p><div className="modal-actions"><button className="button secondary" onClick={() => setImported(null)}>Cancel import</button><button className="button danger" disabled={status === 'saving'} onClick={() => { save(imported); setImported(null); setDetail(null); navigate('dashboard'); }}>Replace journal</button></div></Modal>}
    {editing && journal && <RoutineEditor initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSave={(routine) => {
      save({ ...journal, routines: editing === 'new' ? [...journal.routines, routine] : journal.routines.map((item) => item.id === routine.id ? routine : item) });
      setEditing(null);
    }} />}
    {detail && journal && <WorkoutDetail key={detail.id} onSave={(updated) => { save({ ...journal, history: journal.history.map(w => w.id === updated.id ? updated : w).sort((a,b) => b.finishedAt - a.finishedAt) }); setDetail(updated); }} onDelete={() => { save({ ...journal, history: journal.history.filter(w => w.id !== detail.id) }); setDetail(null); }} workout={detail} journal={journal} onClose={() => setDetail(null)} onProgress={(id) => { setSelected(id); setDetail(null); navigate('progress'); }} />}
  </div>;
}

function Overview({ journal, start, open, navigate, newRoutine }: {
  journal: Journal; start: (routine?: Routine) => void; open: (workout: Workout) => void; navigate: (page: Page) => void; newRoutine: () => void;
}) {
  const featured = journal.routines[0];
  const recent = journal.history[0];
  const month = Date.now() - 30 * 86400000;
  const lastMonth = journal.history.filter((workout) => workout.finishedAt >= month);
  const volume = lastMonth.reduce((sum, workout) => sum + workoutStats(workout).volume, 0);
  const points = progressFor(journal.history, 'bench');
  const current = points.at(-1)?.weight;
  return <>
    <PageHeading title="Training log" subtitle={formatDate(Date.now(), { weekday: 'long', month: 'long', day: 'numeric' })} action={<button className="button secondary blank" onClick={() => start()}><Icon name="plus" size={18} /> {journal.draft ? 'Resume workout' : 'Blank workout'}</button>} />
    <section className="hero" aria-label="Start training"><div className="hero-content">
      <span className="eyebrow"><i />{journal.draft ? 'WORKOUT IN PROGRESS' : featured ? 'QUICK START' : 'START TRAINING'}</span>
      <h2>{journal.draft?.name ?? featured?.name ?? 'Your first workout'}</h2>
      <p>{featured && !journal.draft ? featured.targets.map((item) => exercise(item.exerciseId).group).filter((item, index, all) => all.indexOf(item) === index).join(' / ')
        : journal.draft ? `${workoutStats(journal.draft).sets} sets logged` : 'Log a free workout or build a routine.'}</p>
      <button className="button hero-button" onClick={() => start(featured)}><Icon name="weights" size={20} />{journal.draft ? 'Resume workout' : 'Start workout'}</button>
    </div></section>
    <div className="metrics">
      <Metric icon="calendar" label="Sessions" value={String(lastMonth.length)} note="Last 30 days" />
      <Metric icon="volume" label="Training volume" value={number(volume)} unit="kg" note="Last 30 days" />
      <Metric icon="timer" label="Last session" value={recent ? duration(recent.startedAt, recent.finishedAt) : '—'} note={recent ? `${recent.name} · ${formatDate(recent.finishedAt)}` : 'Finish a workout to begin'} />
    </div>
    <div className="overview-grid">
      <section className="panel dashboard-chart"><div className="section-heading"><div><h2>Bench Press</h2><p>Heaviest set by session</p></div><button className="text-button" onClick={() => navigate('progress')}>View progress <Icon name="chevron" size={15} /></button></div>
        {current !== undefined && <div className="chart-value">{number(current)} <small>kg</small>{points.length > 1 && points.at(-2)!.weight !== current && <span>{current > points.at(-2)!.weight ? '+' : '−'}{number(Math.abs(current - points.at(-2)!.weight))} kg</span>}</div>}
        <Chart points={points} id="bench" />
      </section>
      <section className="panel recent"><div className="section-heading"><h2>Recent workouts</h2><button className="text-button" onClick={() => navigate('history')}>View all <Icon name="chevron" size={15} /></button></div>
        {journal.history.length ? <WorkoutRows workouts={journal.history.slice(0, 4)} open={open} /> : <Empty title="No workouts logged">Your finished workouts will appear here.</Empty>}
      </section>
    </div>
    {!journal.routines.length && <button className="button secondary" onClick={newRoutine}><Icon name="plus" size={18} /> Create a routine</button>}
  </>;
}

function Metric({ icon, label, value, unit, note }: { icon: 'calendar' | 'volume' | 'timer'; label: string; value: string; unit?: string; note: string }) {
  return <article className="panel metric"><div><span>{label}</span><Icon name={icon} size={18} /></div><strong>{value} {unit && <small>{unit}</small>}</strong><span>{note}</span></article>;
}

createRoot(document.getElementById('root')!).render(<App />);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
}
