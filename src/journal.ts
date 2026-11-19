import { migrateJournal, type Journal, type Workspace } from './training.ts';
export type Snapshot = { revision: number; journal: Journal };
export const databaseVersion = 2;
let connection: Promise<IDBDatabase> | undefined;
export function openJournal(): Promise<IDBDatabase> {
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('storage-unavailable')); return; }
    const request = indexedDB.open('settrack', databaseVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('workspaces')) db.createObjectStore('workspaces');
      if (!db.objectStoreNames.contains('safety')) db.createObjectStore('safety');
      const cursor = request.transaction!.objectStore('workspaces').openCursor();
      cursor.onsuccess = () => { const row = cursor.result; if (row) { row.update({ ...row.value, journal: migrateJournal(row.value.journal) }); row.continue(); } };
    };
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); connection = undefined; }; resolve(request.result); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('storage-blocked'));
  }).catch(error => { connection = undefined; throw error; });
  return connection;
}
export async function loadJournal(workspace: Workspace): Promise<Snapshot | undefined> {
  const db = await openJournal();
  return new Promise((resolve,reject) => { const request = db.transaction('workspaces').objectStore('workspaces').get(workspace); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
export async function saveJournal(workspace: Workspace, journal: Journal, revision: number, safety?: Journal) {
  const db = await openJournal();
  return new Promise<number>((resolve,reject) => {
    const transaction = db.transaction(['workspaces','safety'], 'readwrite');
    const store = transaction.objectStore('workspaces'); const current = store.get(workspace); let conflict = false; let writeError: unknown;
    current.onsuccess = () => {
      if ((current.result?.revision ?? 0) !== revision) { conflict = true; transaction.abort(); return; }
      try {
        if (safety) transaction.objectStore('safety').put(safety, workspace);
        store.put({ revision: revision + 1, journal }, workspace);
      } catch (error) { writeError = error; transaction.abort(); }
    };
    transaction.oncomplete = () => resolve(revision + 1);
    transaction.onabort = () => reject(conflict ? new Error('workspace-conflict') : writeError ?? transaction.error ?? new Error('Storage write interrupted'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Storage write failed'));
  });
}
export async function loadSafety(workspace: Workspace): Promise<Journal | undefined> {
  const db = await openJournal();
  return new Promise((resolve,reject) => { const request = db.transaction('safety').objectStore('safety').get(workspace); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
export function storageMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'workspace-conflict') return 'This journal changed in another tab. Export your unsaved changes before reloading the newest version.';
  if (message === 'storage-blocked') return 'Close other SetTrack tabs to finish upgrading storage, then reload.';
  if (error instanceof DOMException && error.name === 'QuotaExceededError') return 'Device storage is full (quota exceeded). Back up your unsaved journal, free some space, then reload.';
  return 'IndexedDB is unavailable or a save failed. Private browsing or blocked site storage may prevent saving. Export any unsaved journal, allow site storage and reload.';
}

export async function moveDraftToPersonal(revision: number) {
  const db = await openJournal();
  return new Promise<void>((resolve,reject) => {
    const tx = db.transaction('workspaces','readwrite'); const store = tx.objectStore('workspaces');
    const demo = store.get('demo'); const personal = store.get('personal'); let count = 0; let failure = '';
    const ready = () => {
      if (++count !== 2) return;
      if (demo.result?.revision !== revision) failure = 'workspace-conflict';
      else if (personal.result?.journal.draft) failure = 'My journal already has an active draft. Both drafts are safe; finish that draft before moving this one.';
      if (failure) { tx.abort(); return; }
      const target = personal.result ?? {revision:0,journal:{routines:[],history:[],draft:null}};
      store.put({revision:target.revision+1,journal:{...target.journal,draft:demo.result.journal.draft}},'personal');
      store.put({revision:revision+1,journal:{...demo.result.journal,draft:null}},'demo');
    };
    demo.onsuccess = ready; personal.onsuccess = ready;
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(new Error(failure || 'Storage write interrupted'));tx.onerror=()=>reject(tx.error);
  });
}
