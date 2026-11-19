import { migrateJournal, exerciseType, library, validSet, type Journal } from './training.ts';

export const backupVersion = 3;
export type Backup = { app: 'settrack'; version: 3; journal: Journal };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const time = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 8640000000000000;
const list = (v: unknown, check: (v: unknown) => boolean): boolean => Array.isArray(v) && v.every(check);
const unique = (v: unknown[], key: string) => new Set(v.map(x => object(x) ? x[key] : undefined)).size === v.length;
const exerciseId = (v: unknown) => library.some(x => x.id === v);
function set(v: unknown): boolean {
  return object(v) && text(v.id) && typeof v.weight === 'string' && typeof v.reps === 'string' && typeof v.done === 'boolean'
    && (v.seconds === undefined || typeof v.seconds === 'string')
    && (v.enteredWeight === undefined || object(v.enteredWeight) && ['kg','lb'].includes(String(v.enteredWeight.unit)) && typeof v.enteredWeight.value === 'string');
}
function lifts(v: unknown, completed = false): boolean {
  return list(v, x => object(x) && exerciseId(x.exerciseId) && (x.type === undefined || ['weight','bodyweight','timed'].includes(String(x.type))) && list(x.sets, set) && (x.sets as Journal['history'][number]['lifts'][number]['sets']).every(s => !completed || !s.done || validSet(s, exerciseType(x as Journal['history'][number]['lifts'][number]))) && unique(x.sets as unknown[], 'id')) && unique(v as unknown[], 'exerciseId');
}
export function validateJournal(v: unknown): v is Journal {
  if (!object(v)) return false;
  const workout = (x: unknown, draft = false) => object(x) && text(x.id) && text(x.name) && time(x.startedAt) && lifts(x.lifts, !draft)
    && (draft ? x.restUntil === null || time(x.restUntil) : time(x.finishedAt) && x.finishedAt >= x.startedAt
      && (x.lifts as Journal['history'][number]['lifts']).every(l => l.sets.every(s => s.done)));
  return list(v.routines, x => object(x) && text(x.id) && text(x.name) && list(x.targets, t => object(t) && exerciseId(t.exerciseId) && (t.type === undefined || ['weight','bodyweight','timed'].includes(String(t.type)))
    && Number.isInteger(t.sets) && Number(t.sets) >= 1 && Number(t.sets) <= 20 && Number.isInteger(t.reps) && Number(t.reps) >= 1 && Number(t.reps) <= (t.type === 'timed' ? 86400 : 200))
    && unique(x.targets as unknown[], 'exerciseId')) && unique(v.routines as unknown[], 'id')
    && list(v.history, x => workout(x)) && unique(v.history as unknown[], 'id') && (v.draft === null || workout(v.draft, true));
}

// Version 1 exports used `data`; version 2 names the payload `journal`.
export function migrateBackup(value: unknown): Backup {
  if (!object(value) || value.app !== 'settrack' || ![1, 2, backupVersion].includes(Number(value.version)) || typeof value.version !== 'number') {
    throw new Error('Unsupported backup format or version. Choose a SetTrack backup (version 1, 2 or 3).');
  }
  const journal = value.version === 1 ? value.data : value.journal;
  if (!validateJournal(journal)) throw new Error('Invalid journal data. Your current journal has not been changed.');
  return { app: 'settrack', version: backupVersion, journal: migrateJournal(journal) };
}
export function exportBackup(journal: Journal): string {
  return JSON.stringify({ app: 'settrack', version: backupVersion, journal }, null, 2);
}
export function importBackup(json: string): Journal {
  let value: unknown;
  try { value = JSON.parse(json); } catch { throw new Error('This file is not a valid SetTrack backup. Your current journal has not been changed.'); }
  return migrateBackup(value).journal;
}
