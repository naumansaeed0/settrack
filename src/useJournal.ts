import { useEffect, useRef, useState } from "react";
import {
  demoJournal,
  emptyJournal,
  type Journal,
  type Workspace,
} from "./training.ts";
import { validateJournal } from "./backup.ts";
import {
  loadJournal,
  loadSafety,
  moveDraftToPersonal,
  saveJournal,
  storageMessage,
} from "./journal.ts";

type Recovery = { revision: number; journal: Journal; at: number };
export function useJournal(workspace: Workspace) {
  const [journal, setJournal] = useState<Journal | null>(null);
  const [status, setStatus] = useState<"ready" | "saving" | "error">("ready");
  const [storageError, setStorageError] = useState("");
  const [undoImport, setUndoImport] = useState(false);
  const value = useRef<Journal | null>(null);
  const revision = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const waiting = useRef<Journal | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const failed = useRef(false);
  const key = useRef(`settrack:recovery:${workspace}:${crypto.randomUUID()}`);
  function remember(next: Journal) {
    try {
      localStorage.setItem(
        key.current,
        JSON.stringify({
          revision: revision.current,
          journal: next,
          at: Date.now(),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
  function forget() {
    try {
      localStorage.removeItem(key.current);
    } catch {
      /* Browser storage may be blocked. */
    }
  }
  function error(reason: unknown) {
    if (failed.current) return;
    failed.current = true;
    setStatus("error");
    setStorageError(storageMessage(reason));
  }
  function flush(): Promise<void> {
    clearTimeout(timer.current);
    const next = waiting.current;
    waiting.current = null;
    if (!next) return queue.current;
    const write = queue.current.then(async () => {
      if (failed.current)
        throw new Error("Previous save failed; export your unsaved journal.");
      revision.current = await saveJournal(workspace, next, revision.current);
      if (value.current === next && !waiting.current) {
        forget();
        setStatus("ready");
      } else if (value.current) remember(value.current);
    });
    queue.current = write.catch(error);
    return write;
  }
  function save(next: Journal) {
    if (failed.current) return;
    const previous = value.current;
    value.current = next;
    setJournal(next);
    setStatus("saving");
    waiting.current = next;
    const durable = remember(next);
    const draftOnly =
      previous &&
      previous.history === next.history &&
      previous.routines === next.routines;
    clearTimeout(timer.current);
    if (draftOnly && durable)
      timer.current = setTimeout(() => {
        void flush().catch(() => undefined);
      }, 400);
    else void flush().catch(() => undefined);
  }
  useEffect(() => {
    let active = true;
    void loadJournal(workspace)
      .then(async (saved) => {
        if (!active) return;
        revision.current = saved?.revision ?? 0;
        let next =
          saved?.journal ??
          (workspace === "demo" ? demoJournal() : emptyJournal());
        const recoveries: { key: string; data: Recovery }[] = [];
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)!;
            if (!k.startsWith(`settrack:recovery:${workspace}:`)) continue;
            try {
              const data = JSON.parse(localStorage.getItem(k)!);
              if (
                data.revision === revision.current &&
                validateJournal(data.journal)
              )
                recoveries.push({ key: k, data });
            } catch {
              /* Ignore unrelated malformed settings. */
            }
          }
        } catch {
          /* IndexedDB remains usable. */
        }
        recoveries.sort((a, b) => b.data.at - a.data.at);
        if (recoveries[0]) next = recoveries[0].data.journal;
        value.current = next;
        setJournal(next);
        if (recoveries.length) {
          try {
            revision.current = await saveJournal(
              workspace,
              next,
              revision.current,
            );
            for (const r of recoveries) localStorage.removeItem(r.key);
          } catch (reason) {
            error(reason);
          }
        }
        if (active) setUndoImport(!!(await loadSafety(workspace)));
      })
      .catch((reason) => {
        if (active) error(reason);
      });
    const leave = () => {
      void flush().catch(() => undefined);
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") leave();
    };
    window.addEventListener("pagehide", leave);
    document.addEventListener("visibilitychange", hidden);
    document.addEventListener("focusout", leave);
    return () => {
      active = false;
      leave();
      window.removeEventListener("pagehide", leave);
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("focusout", leave);
    };
  }, [workspace]);
  async function replace(next: Journal, keepSafety = true) {
    if (!value.current || failed.current) return false;
    try {
      await flush();
      setStatus("saving");
      revision.current = await saveJournal(
        workspace,
        next,
        revision.current,
        keepSafety ? value.current : null,
      );
      value.current = next;
      setJournal(next);
      setUndoImport(keepSafety);
      forget();
      setStatus("ready");
      return true;
    } catch (reason) {
      error(reason);
      return false;
    }
  }
  async function undo() {
    const previous = await loadSafety(workspace);
    return previous ? replace(previous, false) : false;
  }
  async function move() {
    await flush();
    await moveDraftToPersonal(revision.current);
    forget();
  }
  return {
    journal,
    status,
    storageError,
    save,
    flush,
    replace,
    undo,
    undoImport,
    move,
  };
}
