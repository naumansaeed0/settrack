export type Page = 'dashboard' | 'routines' | 'history' | 'progress' | 'workout' | 'data';
export function routePage(): Page {
  const value = location.hash.slice(1);
  return ['dashboard', 'routines', 'history', 'progress', 'workout', 'data'].includes(value) ? value as Page : 'dashboard';
}
export const navigation = [{ id: 'dashboard', label: 'Overview' }, { id: 'routines', label: 'Routines' }, { id: 'history', label: 'History' }, { id: 'progress', label: 'Progress' }, { id: 'data', label: 'Your data' }] as const;

