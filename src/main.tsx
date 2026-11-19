import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import { WorkoutHistory } from './history.tsx';
import { PwaUpdate } from './pwa.tsx';
import { UnitProvider, useUnits } from './units.tsx';
import { useRestAlert } from './useRestAlert.ts';
import { useWakeLock } from './useWakeLock.ts';
import { DataControls } from './data.tsx';
import { useJournal } from './useJournal.ts';
import { exercise, finishWorkout, library, progressMetric, progressFor, repeatWorkout, startWorkout,
  type ExerciseId, type Journal, type Routine, type Workout, type Workspace } from './training.ts';
import { Chart, Empty, formatDate, Icon, Modal, number, PageHeading } from './ui.tsx';
import { RoutineEditor, WorkoutDetail, WorkoutEditor } from './workout.tsx';
import { ThemeControl } from './theme.tsx';
import { Overview } from './overview.tsx';
import { navigation, routePage, type Page } from './navigation.ts';
import './styles.css';

function initialWorkspace(): Workspace {
  const requested = new URLSearchParams(location.search).get('workspace');
  if (requested) return requested === 'personal' ? 'personal' : 'demo';
  try { return localStorage.getItem('settrack:workspace') === 'personal' ? 'personal' : 'demo'; } catch { return 'demo'; }
}

function App() {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [switcher, setSwitcher] = useState(false);
  useEffect(() => {
    const sync = () => setWorkspace(initialWorkspace());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  function switchWorkspace(option: Workspace) {
    if (option === workspace) { setSwitcher(false); return; }
    const url = new URL(location.href);
    url.searchParams.set('workspace', option);
    url.hash = 'dashboard';
    window.history.replaceState(null, '', url);
    try { localStorage.setItem('settrack:workspace', option); } catch { /* The URL still preserves the workspace on reload. */ }
    setWorkspace(option);
    setSwitcher(false);
  }
  return <>
    <UnitProvider key={workspace} workspace={workspace}><JournalApp workspace={workspace} openSwitcher={() => setSwitcher(true)} usePersonal={() => switchWorkspace('personal')} /></UnitProvider>
    {switcher && <Modal title="Switch workspace" onClose={() => setSwitcher(false)}>
      <p>Each workspace keeps its own routines and workout history on this device.</p>
      <div className="picker">{(['demo', 'personal'] as const).map((option) => <button className="picker-row" key={option} onClick={() => switchWorkspace(option)}><span><strong>{option === 'demo' ? 'Demo journal' : 'My journal'}</strong><small>{option === 'demo' ? 'Sample routines and lifting history' : 'Your own routines and workouts'}</small></span><Icon name={workspace === option ? 'check' : 'chevron'} size={18} /></button>)}</div>
    </Modal>}
  </>;
}

function JournalApp({ workspace, openSwitcher, usePersonal }: { workspace: Workspace; openSwitcher: () => void; usePersonal: () => void }) {
  const { unit, setUnit, weight, preferenceError } = useUnits();
  const {journal,status,storageError,save,replace,undo,undoImport,move} = useJournal(workspace);
  const [page, setPage] = useState<Page>(() => routePage());
  const [selected, setSelected] = useState<ExerciseId>('bench');
  const [editing, setEditing] = useState<Routine | 'new' | null>(null);
  const [detail, setDetail] = useState<Workout | null>(null);
  const [persistence, setPersistence] = useState('');
  const focusAfterNavigation = useRef(false);
  const main = useRef<HTMLElement>(null);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener('online', sync); window.addEventListener('offline', sync);
    return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync); };
  }, []);

  useEffect(() => {
    let active = true;
    if (navigator.storage?.persist) {
      void navigator.storage.persist().then(granted => { if (active) setPersistence(granted ? 'Persistent storage enabled.' : 'Your browser may clear this journal under storage pressure. Export backups regularly.'); }).catch(() => { if (active) setPersistence('Persistent storage is unavailable. Export backups regularly.'); });
    } else setPersistence('Persistent storage is unavailable. Export backups regularly.');
    return () => { active = false; };
  }, [workspace]);

  const initialized = useRef(false);
  useEffect(() => { if (journal && !initialized.current) { initialized.current = true; setSelected(journal.history[0]?.lifts[0]?.exerciseId ?? journal.routines[0]?.targets[0]?.exerciseId ?? 'bench'); if (!journal.draft && routePage() === 'workout') { setPage('dashboard'); location.hash = 'dashboard'; } } }, [journal]);

  useEffect(() => {
    if (focusAfterNavigation.current) main.current?.focus();
  }, [page]);

  useEffect(() => {
    const sync = () => { if (location.hash !== '#content') setPage(routePage()); };
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

  async function replaceJournal(next: Journal) {
    const restored = await replace(next); if (restored) { setDetail(null); if (page === 'workout' && !next.draft) navigate('dashboard'); } return restored;
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

  const restMessage = useRestAlert(journal?.draft?.restUntil);
  const wakeMessage = useWakeLock(!!journal?.draft);
  const metric = journal ? progressMetric(journal.history, selected) : 'weight';
  const points = journal ? progressFor(journal.history, selected) : [];
  const newRoutine = <button className="button primary" onClick={() => setEditing('new')}><Icon name="plus" size={18} /> New routine</button>;

  return <div className={`shell ${journal?.draft ? 'has-draft' : ''}`}>
    <a className="skip" href="#content">Skip to content</a>
    <aside className="sidebar">
      <a className="brand" href="./" onClick={(event) => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate('dashboard'); }}><img src={`${import.meta.env.BASE_URL}mark.svg`} width="39" height="39" alt="" /><span>SetTrack<small>Training journal</small></span></a>
      <nav aria-label="Journal">{navigation.map(({ id, label }) => <button key={id} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon name={id} /> <span>{label}</span></button>)}
        {journal?.draft && <button className={page === 'workout' ? 'active workout-nav' : 'workout-nav'} aria-current={page === 'workout' ? 'page' : undefined} onClick={() => navigate('workout')}><Icon name="weights" /> <span>Workout</span></button>}
      </nav>
      <button className="workspace" onClick={openSwitcher} disabled={status === 'saving'}><span className="workspace-icon"><Icon name="workspace" size={18} /></span><span><strong>{workspace === 'demo' ? 'Demo journal' : 'My journal'}</strong><small>Switch workspace</small></span><Icon name="chevron" size={15} /></button>
    </aside>
    <div className="body">
      <header className="topbar"><ThemeControl /><label className="unit-switch">Units <select aria-label="Weight units" value={unit} onChange={e => setUnit(e.target.value as 'kg' | 'lb')}><option value="kg">kg</option><option value="lb">lb</option></select></label><span className="current-view">{page === 'workout' ? 'Active workout' : navigation.find((item) => item.id === page)?.label}</span><div role="status" className="storage-status"><i data-status={status} />{status === 'saving' ? 'Saving…' : status === 'error' ? 'Save failed' : journal ? 'Stored on this device' : 'Opening journal…'}</div></header>
      <main id="content" ref={main} tabIndex={-1} aria-busy={!journal && !storageError}>
        {!online && <p className="offline-note" aria-live="polite"><Icon name="check" size={16} /> You’re offline. Your journal still saves on this device.</p>}
        <PwaUpdate safeToReload={status === 'ready' && !storageError} />
        {preferenceError && <p role="alert">{preferenceError}</p>}
        {restMessage && <p className="rest-notice" role="alert">{restMessage}</p>}
        {wakeMessage && <p className="storage-note">{wakeMessage}</p>}
        {storageError && <p className="error" role="alert">{storageError} <button className="text-button" onClick={() => location.reload()}>Reload</button></p>}
        {!journal && !storageError && <p className="loading-journal">Opening your journal…</p>}
        <div inert={!!storageError}>
          {journal && page === 'dashboard' && <Overview onProgress={id => { setSelected(id); navigate('progress'); }} workspace={workspace} usePersonal={usePersonal} canSwitch={status !== 'saving'} addTemplate={(routine) => { save({ ...journal, routines: [...journal.routines, { ...routine, id: crypto.randomUUID(), targets: routine.targets.map(target => ({ ...target })) }] }); navigate('routines'); }} journal={journal} start={start} open={setDetail} navigate={navigate} newRoutine={() => setEditing('new')} />}
          {journal && page === 'routines' && <><PageHeading title="Routines" subtitle="Build a workout you can return to." action={newRoutine} />
            {journal.routines.length ? <div className="routine-cards">{journal.routines.map((routine) => <article className="panel routine-card" key={routine.id}><span className="row-icon"><Icon name="weights" /></span><h2>{routine.name}</h2><p>{routine.targets.length} exercises · {routine.targets.reduce((sum, item) => sum + item.sets, 0)} target sets</p><ul>{routine.targets.map((target) => <li key={target.exerciseId}>{exercise(target.exerciseId).name}<span>{target.sets} × {target.reps}</span></li>)}</ul><div className="routine-actions"><button className="button primary" onClick={() => start(routine)}>{journal.draft ? 'Resume workout' : 'Start workout'}</button><button className="button secondary" onClick={() => setEditing(routine)} aria-label={`Edit ${routine.name}`}>Edit</button></div></article>)}</div>
              : <section className="panel"><Empty title="No routines yet">Create a routine with the exercises you train most often.</Empty></section>}</>}
          {journal && page === 'history' && <WorkoutHistory history={journal.history} open={setDetail} />}
          {journal && page === 'progress' && <><PageHeading title="Lift progress" subtitle="Follow your best completed set from session to session." />
            <section className="panel progress-panel"><div className="section-heading"><h2>{exercise(selected).name}</h2><label className="field"><span className="sr-only">Exercise</span><select value={selected} onChange={(event) => setSelected(event.target.value as ExerciseId)}>{library.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
              {points.length > 0 && <div className="progress-metrics"><div><small>{metric === 'weight' ? 'Heaviest set' : 'Best set'}</small><strong>{number(metric === 'weight' ? weight(Math.max(...points.map((point) => point.weight))) : Math.max(...points.map(point => point.weight)))} <small>{metric === 'weight' ? unit : metric}</small></strong></div><div><small>Sessions</small><strong>{points.length}</strong></div></div>}
              <Chart metric={metric} points={points} id={selected} />
              {points.length > 0 && <details><summary>Session data</summary><table className="data-table"><thead><tr><th scope="col">Date</th><th scope="col">Best set</th></tr></thead><tbody>{[...points].reverse().map((point, index) => <tr key={`${point.date}-${index}`}><td>{formatDate(point.date, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>{number(metric === 'weight' ? weight(point.weight) : point.weight)} {metric === 'weight' ? unit : metric}</td></tr>)}</tbody></table></details>}
            </section></>}
          {journal?.draft && page === 'workout' && <WorkoutEditor switchToPersonal={async () => { await move(); usePersonal(); }} workspace={workspace} draft={journal.draft} history={journal.history} change={(draft) => save({ ...journal, draft })} finish={finish} discard={() => { save({ ...journal, draft: null }); navigate('dashboard'); }} />}
        </div>
        {journal && <DataControls key={workspace} journal={journal} workspace={workspace} busy={status === 'saving'} error={storageError} persistence={persistence} expanded={page === 'data'} replace={replaceJournal} undo={undo} canUndo={undoImport} />}
      </main>
      {journal && <footer><span>SetTrack</span><span>Strength training journal</span></footer>}
    </div>
    {editing && journal && <RoutineEditor initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSave={(routine) => {
      save({ ...journal, routines: editing === 'new' ? [...journal.routines, routine] : journal.routines.map((item) => item.id === routine.id ? routine : item) });
      setEditing(null);
    }} />}
    {detail && journal && <WorkoutDetail key={detail.id} onRepeat={() => { if (journal.draft) return; save({ ...journal, draft: repeatWorkout(detail) }); setDetail(null); navigate('workout'); }} onSave={(updated) => { save({ ...journal, history: journal.history.map(w => w.id === updated.id ? updated : w).sort((a,b) => b.finishedAt - a.finishedAt) }); setDetail(updated); }} onDelete={() => { save({ ...journal, history: journal.history.filter(w => w.id !== detail.id) }); setDetail(null); }} workout={detail} journal={journal} onClose={() => setDetail(null)} onProgress={(id) => { setSelected(id); setDetail(null); navigate('progress'); }} />}
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
