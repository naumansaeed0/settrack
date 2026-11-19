# Data, backups and sharing

[← SetTrack](../README.md) · [Data guide](data-guide.md) · [Architecture](architecture.md) · [Deployment](deployment.md)

Routines, completed workouts and the active draft live in **this browser profile on this device**. Clearing site data or uninstalling can delete them. Another browser or device does not receive a copy automatically. iOS may evict website data, especially when the site is not added to the home screen. Installing the PWA helps usability but is not a substitute for backups.

**Your data** shows the persistence request result, the browser's storage estimate and the last full backup date. Storage estimates include cached app files and may include other pages on the same origin. Persistent storage is requested, not guaranteed. Private-mode/blocked storage, quota failures and revision conflicts have actionable error messages; unsaved in-memory data remains available to back up.

Draft database writes debounce for 400 ms and flush on blur, hiding and page exit. A synchronous local recovery record protects pending edits during tab closure. A matching revision can be recovered on reopening. This is local recovery, not an off-device backup, and cannot protect against clearing all site data or arbitrary OS/storage failures.

A dismissible reminder appears after 14 days without a backup or 10 workouts not included in the last backup. On iOS outside standalone mode, the data screen suggests **Safari → Share → Add to Home Screen**.

## Keep a portable copy

### Back up my journal

Creates one full-fidelity file containing the selected workspace's routines, history and draft. Export each workspace separately. Units, theme, timer duration and backup-reminder settings are device preferences, not journal data.

File sharing tries `SetTrack-backup-YYYY-MM-DD.settrack` with `application/octet-stream`. If `navigator.canShare({ files })` or the share call rejects that representation, it tries `.json` / `application/json`, then `.txt` / `text/plain`. If sharing is unavailable, it downloads the `.settrack` file. Cancelling the share sheet does not mark a backup as successful. A completed share/download updates the workspace's last-backup setting.

The fallback branches are tested with simulated browser APIs. **Acceptance by physical Android/iOS share sheets and individual apps is UNVERIFIED.** Backups contain private training data; choose the destination yourself.

### Restore from backup

Accepts `.settrack`, `.txt` and legacy `.json` backups, up to 20 MB. It validates the format, version, journal structure, known exercises, IDs, dates and completed sets, then asks before replacing a workspace. Invalid files do not change the journal. Before replacement, the current journal is saved as one **pre-import safety snapshot** in the same database transaction. **Undo import** restores it and clears the snapshot. A subsequent import replaces the previous safety snapshot.

The current internal full-backup format is **v3**:

```json
{
  "app": "settrack",
  "version": 3,
  "journal": { "routines": [], "history": [], "draft": null }
}
```

Legacy **v1** uses `data` instead of `journal`; **v2** uses `journal` without typed-exercise fields. Both migrate to v3; real fixture files are under `tests/fixtures/`. Valid v3 files are accepted. Unknown future versions are rejected with a clear message rather than crashing.

### Export to spreadsheet / Import from spreadsheet

CSV contains **history only**. It cannot represent routines or an active draft. Export uses UTF-8 with a BOM for Excel, standard quoted CSV fields, and spreadsheet-formula escaping. Names with commas, quotes and line breaks round-trip. Display weights are exported in the selected unit with two decimal places; use a full backup when exact original entry data matters.

One row represents one completed set. The exact column order is:

| Column | Meaning |
|---|---|
| Workout ID | Stable workout identifier used to skip existing workouts |
| Date | Finish time as ISO 8601 |
| Started at | Start time as ISO 8601; must not be after finish |
| Workout | Workout name |
| Exercise ID | A built-in exercise identifier |
| Exercise | Matching human-readable exercise name |
| Type | `weight`, `bodyweight`, or `timed` |
| Set ID | Stable set identifier within the workout |
| Set number | Positive exercise-local set order |
| Weight | Non-negative weight in the stated unit |
| Unit | `kg` or `lb` |
| Reps | Integer 1–200 for rep-based sets; empty for timed sets |
| Seconds | Integer 1–86400 for timed sets |
| Is record | Informational `true`/`false`; records are recomputed on import |

Import validates every row, reports row-level errors and changes nothing if errors exist. The preview shows workout/set counts and duplicate counts before confirmation. It **merges** new workouts by stable workout ID, skipping existing IDs, preserving routines/draft, and taking a safety snapshot for undo. An existing workout is never overwritten by CSV.

### Share this workout

Workout details offer a plain-text summary suitable for WhatsApp or messages: name/date, exercises, sets and `[PR]` markers. It uses native text sharing where available and otherwise copies to the clipboard, with selectable text when clipboard access fails. Sharing does not create an account or send anything automatically to a specific service.

