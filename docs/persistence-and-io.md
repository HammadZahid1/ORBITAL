# Persistence and import/export

All persistence is local to the browser. [`src/storage/localStorage.ts`](../src/storage/localStorage.ts) wraps `window.localStorage` with `safeGet`, `safeSet`, `safeRemove`, and `safeKeys`; these never throw if storage is disabled, full, or unavailable. There is no server, account, sync, or telemetry.

## Keys and envelope

[`src/storage/schema.ts`](../src/storage/schema.ts) defines `STORAGE_PREFIX = 'orbital:'` and `SCHEMA_VERSION = 1`. Every stored or exported document is an envelope:

```json
{
  "version": 1,
  "kind": "universe",
  "savedAt": 1760000000000,
  "data": { "...": "..." }
}
```

`wrap(kind, data)` stamps the current time. `unwrap(raw, kind, validator)` parses JSON, requires the exact version and kind, validates `data`, and returns `null` on any failure. There is no migration path for other versions.

Current keys after the prefix is applied:

| Key | Contents |
| --- | --- |
| `orbital:settings` | App preferences envelope with `kind: 'settings'`. |
| `orbital:universes:index` | JSON array of saved universe IDs. |
| `orbital:universes:<id>` | Universe envelope with `kind: 'universe'`. |

## Settings

[`src/storage/settings.ts`](../src/storage/settings.ts) saves settings from every `updateSettings` call in [`src/state/uiStore.ts`](../src/state/uiStore.ts). On load, `validateSettingsShape` performs a shallow check and `normaliseSettings` merges stored values over `DEFAULT_SETTINGS`, including a nested merge of `performance`. This keeps newly added fields present when older saves are loaded.

Some persisted options are not applied by the runtime: `panelAnimations`, `showLabels`, `showGrid`, `units`, `precision`, `cameraDistance`, `performance.adaptiveQuality`, and `performance.targetFps`. They are documented in [Controls and accessibility](controls-and-accessibility.md) and [Performance](performance.md). Their persistence does not imply behaviour.

## Saved universes

[`src/storage/universes.ts`](../src/storage/universes.ts) provides:

- `saveUniverse` — structured-clones the universe, wraps it, writes the ID key, and appends the ID to the index.
- `loadUniverse` — validates version, kind, and a light universe shape.
- `listUniverses` — loads index entries and sorts by `updatedAt` descending.
- `deleteUniverse` — removes the entry and rewrites the index.
- `renameUniverse` and `duplicateUniverse` — update or clone with a new generated ID.
- `savedUniverseCount` — counts universe keys.

The Saved Universes panel reports storage failures through notifications. Saves contain the serialisable universe definition, including body properties and solver settings; they do not contain analytics history, trajectory buffers, active module, camera state, or layer configuration.

## JSON import and export

[`src/storage/importExport.ts`](../src/storage/importExport.ts) exports pretty-printed JSON with the same envelope. `importUniverseJson` rejects invalid JSON, non-objects, versions other than `1`, kinds other than `universe`, and data rejected by `validateUniverseShape`. `validateUniverseShape` checks ID/name types, body shapes, unique body IDs, and finite `G`, `softening`, `timestep`, plus a recognized integrator ID. It does not exhaustively validate every visual field.

`safeFilename` strips unsafe characters, and `downloadJson` creates an object URL, clicks a temporary anchor, then revokes the URL. Imported universes load with scenario ID `imported` and are not auto-saved; use the local save button if you want to keep them.

## CSV analytics export

[`src/storage/download.ts`](../src/storage/download.ts) supplies `downloadText` and `toCsv`. The Analysis panel exports `orbital-analytics.csv` with a header row of `time` plus every `MetricId`, using the current in-memory analytics samples. The CSV is an RFC-4180-style text document with quoted commas, quotes, and newlines. It is a snapshot of measured samples, not a replay file.

## Practical cautions

- Browser storage can be cleared by the user or blocked by privacy settings; exported JSON is the portable backup.
- Import replaces the active universe and resets the simulation; there is no undo buffer.
- A valid envelope from a future version is rejected rather than partially loaded.
- Large universes are limited by browser storage quotas and by solver cost; see [Performance](performance.md).

Tests for storage behaviour live in [`src/tests/persistence.test.ts`](../src/tests/persistence.test.ts). Continue with [Data schema](data-schema.md).
