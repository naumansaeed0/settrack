import { createContext, useContext, useState, type ReactNode } from 'react';
import { displayWeight, storedWeight, type Unit, type Workspace } from './training.ts';
const Units = createContext({ unit: 'kg' as Unit, setUnit: (_unit: Unit) => {}, preferenceError: '' });
export function UnitProvider({ workspace, children }: { workspace: Workspace; children: ReactNode }) {
  const [unit, update] = useState<Unit>(() => { try { return localStorage.getItem(`settrack:${workspace}:unit`) === 'lb' ? 'lb' : 'kg'; } catch { return 'kg'; } });
  const [preferenceError, setError] = useState('');
  const setUnit = (value: Unit) => { update(value); try { localStorage.setItem(`settrack:${workspace}:unit`, value); } catch { setError('Unit preference could not be saved and will reset after reload.'); } };
  return <Units.Provider value={{ unit, setUnit, preferenceError }}>{children}</Units.Provider>;
}
export function useUnits() {
  const context = useContext(Units);
  return { ...context, weight: (value: number | string) => displayWeight(Number(value), context.unit), inputWeight: (value: string) => value === '' ? '' : String(displayWeight(Number(value), context.unit)), fromInput: (value: string) => storedWeight(value, context.unit) };
}
