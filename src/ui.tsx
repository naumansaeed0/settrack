import { useEffect, useRef, type ReactNode } from 'react';
import { exercise, workoutStats, type ExerciseId, type Workout } from './training.ts';

const paths = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  routines: 'M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5 M12 7v5l3 2',
  progress: 'M3 3v18h18 M6 15l5-5 4 3 6-7',
  plus: 'M12 5v14 M5 12h14', chevron: 'm9 6 6 6-6 6', back: 'm14 6-6 6 6 6',
  check: 'm5 12 4 4L19 6', close: 'm6 6 12 12 M18 6 6 18',
  weights: 'M2 10v4 M5 7v10 M8 9v6 M8 12h8 M16 9v6 M19 7v10 M22 10v4',
  timer: 'M10 2h4 M12 6a8 8 0 1 0 8 8 8 8 0 0 0-8-8z M12 10v4l2 2',
  calendar: 'M4 6h16v14H4z M8 4v4 M16 4v4 M4 10h16',
  volume: 'M3 18h18 M5 15l4-7 4 4 5-7', workspace: 'M3 5h18v14H3z M8 5v14',
  up: 'm6 14 6-6 6 6', down: 'm6 10 6 6 6-6',
  trophy: 'M8 3h8v7a4 4 0 0 1-8 0z M8 5H4v3a4 4 0 0 0 4 4 M16 5h4v3a4 4 0 0 1-4 4 M12 14v5 M8 21h8',
};

export function Icon({ name, size = 20 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export const formatDate = (value: number, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Intl.DateTimeFormat('en-GB', options).format(value);
export const number = (value: number) => new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(value);

export function duration(start: number, end: number) {
  const minutes = Math.max(0, Math.floor((end - start) / 60000));
  return minutes ? `${minutes} min` : '<1 min';
}

export function PageHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty"><Icon name="weights" size={25} /><strong>{title}</strong><p>{children}</p></div>;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const element = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = element.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={element} aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="modal-header"><h2 id="dialog-title">{title}</h2><button type="button" className="icon-button subtle" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
    {children}
  </dialog>;
}

export function WorkoutRows({ workouts, open }: { workouts: Workout[]; open: (workout: Workout) => void }) {
  return <div className="workout-rows">{workouts.map((workout) => {
    const stats = workoutStats(workout);
    return <button className="history-row" onClick={() => open(workout)} key={workout.id}>
      <span className="row-icon"><Icon name="weights" size={19} /></span>
      <span className="row-name"><strong>{workout.name}</strong><small>{formatDate(workout.finishedAt, { weekday: 'short', day: 'numeric', month: 'short' })}</small></span>
      <span className="row-stat">{stats.sets} sets</span><span className="row-stat">{duration(workout.startedAt, workout.finishedAt)}</span>
      <Icon name="chevron" size={16} />
    </button>;
  })}</div>;
}

export function Chart({ points, id }: { points: { date: number; weight: number }[]; id: ExerciseId }) {
  if (!points.length) return <Empty title="No sets logged for this lift">Log a completed set to start your chart.</Empty>;
  const width = 540;
  const height = 158;
  const maximum = Math.max(...points.map((point) => point.weight));
  const minimum = Math.min(...points.map((point) => point.weight));
  const increment = Math.max(2.5, Math.ceil((maximum - minimum) / 10) * 2.5);
  const bottom = Math.max(0, Math.floor(minimum / increment) * increment);
  const top = Math.max(bottom + increment * 4, Math.ceil(maximum / increment) * increment);
  const left = 42;
  const right = 515;
  const floor = 126;
  const y = (weight: number) => 12 + (top - weight) / (top - bottom) * (floor - 12);
  const first = points[0].date;
  const span = Math.max(1, points.at(-1)!.date - first);
  const coords = points.map((point) => ({ ...point, x: points.length === 1 ? (left + right) / 2 : left + (point.date - first) / span * (right - left), y: y(point.weight) }));
  const line = coords.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const last = coords.at(-1)!;
  return <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${exercise(id).name}, heaviest set by session in kilograms`}>
    <defs><linearGradient id={`area-${id}`} x1="0" x2="0" y1="0" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#3048e0" stopOpacity=".16" /><stop offset="1" stopColor="#3048e0" stopOpacity="0" /></linearGradient></defs>
    {Array.from({ length: 5 }, (_, index) => bottom + (top - bottom) * index / 4).map((value) => <g key={value}>
      <line x1={left} x2={right} y1={y(value)} y2={y(value)} stroke="#e8e7e2" strokeDasharray="3 4" />
      <text x="31" y={y(value) + 4} textAnchor="end">{number(value)}</text>
    </g>)}
    <path d={`${line} L ${last.x} ${floor} L ${coords[0].x} ${floor} Z`} fill={`url(#area-${id})`} />
    <path d={line} fill="none" stroke="#293fd1" strokeWidth="2.6" strokeLinejoin="round" />
    {coords.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={index === coords.length - 1 ? 5 : 3} fill="#293fd1" stroke="white" strokeWidth="1.5"><title>{formatDate(point.date)} · {number(point.weight)} kg</title></circle>)}
    {(coords.length > 2 ? [coords[0], coords[Math.floor(coords.length / 2)], last] : coords).filter((point, index, ticks) => index === 0 || point.x - ticks[index - 1].x > 75).map((point) =>
      <text key={point.date} x={point.x} y="151" textAnchor="middle">{formatDate(point.date)}</text>)}
  </svg>;
}
