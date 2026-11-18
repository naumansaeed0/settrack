import type { Journal, Workspace } from './training.ts';

type Snapshot = { revision: number; journal: Journal };

let connection: Promise<IDBDatabase> | undefined;

function openJournal(): Promise<IDBDatabase> {
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('settrack', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('workspaces');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch((error: unknown) => {
    connection = undefined;
    throw error;
  });
  return connection;
}

export async function loadJournal(workspace: Workspace): Promise<Snapshot | undefined> {
  const db = await openJournal();
  return new Promise((resolve, reject) => {
    const request = db.transaction('workspaces').objectStore('workspaces').get(workspace);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveJournal(workspace: Workspace, journal: Journal, revision: number) {
  const db = await openJournal();
  return new Promise<number>((resolve, reject) => {
    const transaction = db.transaction('workspaces', 'readwrite');
    const store = transaction.objectStore('workspaces');
    const current = store.get(workspace);
    let conflict = false;
    current.onsuccess = () => {
      if ((current.result?.revision ?? 0) !== revision) {
        conflict = true;
        transaction.abort();
        return;
      }
      store.put({ revision: revision + 1, journal }, workspace);
    };
    transaction.oncomplete = () => resolve(revision + 1);
    transaction.onabort = () => reject(conflict ? new Error('workspace-conflict') : transaction.error ?? new Error('The save was interrupted.'));
  });
}
