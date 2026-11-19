import { useEffect, useRef, useState } from "react";
import { importBackup } from "./backup.ts";
import { exportCsv, importCsv } from "./csv.ts";
import { downloadFile, shareBackup } from "./sharing.ts";
import { useUnits } from "./units.tsx";
import { Modal, PageHeading } from "./ui.tsx";
import type { Journal, Workspace } from "./training.ts";

type BackupStamp = { at: number; ids: string[] };
function readSetting<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function DataControls({
  journal,
  workspace,
  busy,
  error,
  persistence,
  expanded,
  replace,
  undo,
  canUndo,
}: {
  journal: Journal | null;
  workspace: Workspace;
  busy: boolean;
  error: string;
  persistence: string;
  expanded: boolean;
  replace: (next: Journal) => Promise<boolean>;
  undo: () => Promise<boolean>;
  canUndo: boolean;
}) {
  const { unit } = useUnits();
  const key = `settrack:${workspace}:backup`;
  const [stamp, setStamp] = useState<BackupStamp | null>(() =>
    readSetting(key, null),
  );
  const [firstSeen] = useState(() =>
    readSetting(`settrack:${workspace}:firstSeen`, Date.now()),
  );
  const [dismissed, setDismissed] = useState(() =>
    readSetting(`settrack:${workspace}:backupDismissed`, 0),
  );
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [candidate, setCandidate] = useState<Journal | null>(null);
  const [csv, setCsv] = useState<ReturnType<typeof importCsv> | null>(null);
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      localStorage.setItem(
        `settrack:${workspace}:firstSeen`,
        JSON.stringify(firstSeen),
      );
    } catch {
      /* Device preference only. */
    }
    void navigator.storage
      ?.estimate?.()
      .then(setEstimate)
      .catch(() => undefined);
  }, [workspace, firstSeen, expanded, journal]);
  const days = Math.floor((Date.now() - (stamp?.at ?? firstSeen)) / 86400000);
  const newWorkouts =
    journal?.history.filter((w) => !stamp?.ids.includes(w.id)).length ?? 0;
  const nudge =
    journal &&
    (days >= 14 || newWorkouts >= 10) &&
    Date.now() - dismissed > 7 * 86400000;
  const ios =
    /(iPad|iPhone|iPod)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const installed =
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone;
  async function backup() {
    if (!journal) return;
    setFailure("");
    try {
      const result = await shareBackup(journal);
      if (!result.saved) {
        setNotice("Backup sharing cancelled.");
        return;
      }
      const next = { at: Date.now(), ids: journal.history.map((w) => w.id) };
      setStamp(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* Backup itself succeeded. */
      }
      setNotice(`Backup ${result.method}: ${result.name}`);
    } catch {
      setFailure(
        "The backup could not be created. Try again or use a different browser.",
      );
    }
  }
  async function read(file: File | undefined, spreadsheet = false) {
    if (!file || !journal) return;
    setFailure("");
    setNotice("");
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("The file is too large. Maximum size is 20 MB.");
      const text = await file.text();
      if (spreadsheet) setCsv(importCsv(text, journal.history));
      else setCandidate(importBackup(text));
    } catch (reason) {
      setFailure(
        reason instanceof Error
          ? reason.message
          : "This file is not a valid SetTrack backup.",
      );
    }
  }
  return (
    <section
      className={expanded ? "data-screen" : "data-toolbar"}
      aria-label="Journal backup and storage"
    >
      {expanded && (
        <>
          <PageHeading
            title="Your data"
            subtitle="Your journal stays with you."
          />
          <div className="data-grid">
            <article className="panel">
              <h2>On this device only</h2>
              <p>
                Your routines, history and draft live in this browser. There is
                no account, cloud copy or automatic sync. Clearing site data or
                uninstalling can delete your journal.
              </p>
              <p>
                Keep a backup somewhere you trust, such as Files, Drive or a
                message to yourself.
              </p>
            </article>
            <article className="panel">
              <h2>Storage health</h2>
              <p>{persistence}</p>
              <p>
                Storage used:{" "}
                {estimate?.usage !== undefined
                  ? `${(estimate.usage / 1048576).toFixed(2)} MB`
                  : "Unavailable"}
                {estimate?.quota
                  ? ` of ${(estimate.quota / 1048576).toFixed(0)} MB`
                  : ""}
              </p>
              <p>
                Last backup:{" "}
                {stamp
                  ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(stamp.at)
                  : "Never on this device"}
              </p>
            </article>
          </div>
        </>
      )}
      {nudge && (
        <aside className="backup-nudge">
          <p>
            {stamp
              ? "It’s time for a fresh backup."
              : "Keep a copy of your training."}{" "}
            {newWorkouts} workouts since your last backup.
          </p>
          <button
            className="button secondary"
            onClick={() => {
              void backup();
            }}
          >
            Back up now
          </button>
          <button
            className="text-button"
            onClick={() => {
              const now = Date.now();
              setDismissed(now);
              try {
                localStorage.setItem(
                  `settrack:${workspace}:backupDismissed`,
                  JSON.stringify(now),
                );
              } catch {
                /* Session dismissal still works. */
              }
            }}
          >
            Remind me later
          </button>
        </aside>
      )}
      {ios && !installed && expanded && (
        <p className="rest-notice">
          On iPhone or iPad, use Safari’s Share menu → Add to Home Screen. iOS
          may evict website data, especially for sites not installed. A
          home-screen app still needs backups.
        </p>
      )}
      <div className="backup-actions">
        <button
          className="button primary"
          disabled={!journal || busy}
          onClick={() => {
            void backup();
          }}
        >
          Back up my journal
        </button>
        <button
          className="button secondary"
          disabled={!journal || busy || !!error}
          onClick={() => backupInput.current?.click()}
        >
          Restore from backup
        </button>
        {expanded && (
          <>
            <button
              className="button secondary"
              disabled={!journal || busy}
              onClick={() => {
                if (journal) {
                  downloadFile(
                    new File(
                      [exportCsv(journal.history, unit)],
                      `SetTrack-history-${new Date().toISOString().slice(0, 10)}.csv`,
                      { type: "text/csv;charset=utf-8" },
                    ),
                  );
                  setNotice(
                    "Spreadsheet downloaded. History only; routines and drafts are included in a full backup.",
                  );
                }
              }}
            >
              Export to spreadsheet
            </button>
            <button
              className="button secondary"
              disabled={!journal || busy || !!error}
              onClick={() => csvInput.current?.click()}
            >
              Import from spreadsheet
            </button>
          </>
        )}
        {canUndo && (
          <button
            className="button secondary"
            disabled={busy || !!error}
            onClick={async () => {
              if (await undo())
                setNotice("Your previous journal was restored.");
            }}
          >
            Undo import
          </button>
        )}
      </div>
      <input
        ref={backupInput}
        hidden
        type="file"
        aria-label="Restore from backup"
        accept=".settrack,.json,.txt,application/json,text/plain,application/octet-stream"
        onChange={(e) => {
          void read(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={csvInput}
        hidden
        type="file"
        aria-label="Import from spreadsheet"
        accept=".csv,text/csv"
        onChange={(e) => {
          void read(e.target.files?.[0], true);
          e.target.value = "";
        }}
      />
      {expanded && (
        <p className="storage-note">
          Full backups include routines, history and your active draft.
          Spreadsheets contain history only and merge by workout ID; existing
          workouts are skipped. The preview checks every row before adding workouts.
        </p>
      )}
      {!expanded && <p className="storage-note">{persistence}</p>}
      {notice && <p aria-live="polite">{notice}</p>}
      {failure && (
        <p className="error" role="alert">
          {failure}
        </p>
      )}
      {candidate && (
        <Modal title="Replace this journal?" onClose={() => setCandidate(null)}>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <p>
            This backup has {candidate.routines.length} routines and{" "}
            {candidate.history.length} workouts
            {candidate.draft ? " plus an active draft" : ""}. Your current
            journal will be kept as one pre-import safety snapshot. You can undo
            the restore.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setCandidate(null)}
            >
              Cancel import
            </button>
            <button
              className="button danger"
              disabled={busy || !!error}
              onClick={async () => {
                if (await replace(candidate)) {
                  setCandidate(null);
                  setNotice(
                    "Backup restored. Use Undo import to recover your previous journal.",
                  );
                }
              }}
            >
              Replace journal
            </button>
          </div>
        </Modal>
      )}
      {csv && (
        <Modal title="Import spreadsheet" onClose={() => setCsv(null)}>
          {csv.errors.length ? (
            <>
              <p>No data has been changed. Fix these rows and try again.</p>
              <ul>
                {csv.errors.map((message, i) => (
                  <li key={i}>{message}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>
              {csv.workouts.length} workouts, {csv.sets} sets will be added.{" "}
              {csv.duplicates} existing workouts will be skipped. Routines and
              drafts stay in place.
            </p>
          )}
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setCsv(null)}>
              Cancel
            </button>
            <button
              className="button primary"
              disabled={busy || !!csv.errors.length || !csv.workouts.length}
              onClick={async () => {
                if (
                  journal &&
                  (await replace({
                    ...journal,
                    history: [...csv.workouts, ...journal.history].sort(
                      (a, b) => b.finishedAt - a.finishedAt,
                    ),
                  }))
                ) {
                  setCsv(null);
                  setNotice(
                    "Spreadsheet imported. Existing workouts were preserved.",
                  );
                }
              }}
            >
              Add workouts
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
