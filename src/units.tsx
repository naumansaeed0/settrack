import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Workspace } from './training.ts';
export type Unit = 'kg' | 'lb';
const factor = 2.2046226218;
export const displayWeight = (kg: number, unit: Unit) => Math.round(kg * (unit === 'lb' ? factor : 1) * 100) / 100;
export const storedWeight = (value: string, unit: Unit) => value.trim() === '' ? '' : String(Math.round(Number(value) / (unit === 'lb' ? factor : 1) * 1e6) / 1e6);
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
