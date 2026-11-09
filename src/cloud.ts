// Cloud backup: the save is mirrored to /api/save under a random save ID that
// lives on this device. Typing that ID on another device downloads the save.
// Everything still works offline; uploads retry when the connection returns.
import { ID_ALPHABET, normalizeId, formatId, mergeSaves } from './saveid.ts';
import { load, save, type Save } from './progress.ts';

const ID_KEY = 'gl-cloud-id';
const SYNC_KEY = 'gl-cloud-synced';

export function cloudId(): string {
  const have = normalizeId(localStorage.getItem(ID_KEY) ?? '');
  if (have) return have;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const id = Array.from(bytes, b => ID_ALPHABET[b & 31]).join('');
  localStorage.setItem(ID_KEY, id);
  return id;
}
/** Start over under a brand-new ID (the old save stays restorable with the old ID). */
export function newCloudId() {
  localStorage.removeItem(ID_KEY);
  localStorage.removeItem(SYNC_KEY);
  return cloudId();
}
export const displayId = () => formatId(cloudId());
export const lastSynced = () => Number(localStorage.getItem(SYNC_KEY)) || 0;

let inflight: Promise<Save | null> | null = null;
let again = false;

/** Upload the current save. Resolves with the merged save if the cloud added anything. */
export function backup(): Promise<Save | null> {
  if (inflight) { again = true; return inflight; }
  inflight = (async () => {
    try {
      const local = load();
      if (!Object.keys(local.best).length) return null; // nothing worth backing up yet
      const res = await fetch('/api/save', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: cloudId(), save: local }),
      });
      if (!res.ok) return null;
      localStorage.setItem(SYNC_KEY, String(Date.now()));
      const { save: winner } = await res.json();
      const merged = mergeSaves(load(), winner);
      if (JSON.stringify(merged.best) !== JSON.stringify(load().best)) { save(merged); return load(); }
      return null;
    } catch { return null; } // offline: try again later
    finally {
      inflight = null;
      if (again) { again = false; void backup(); }
    }
  })();
  return inflight;
}

export type RestoreResult = { ok: true } | { ok: false; reason: string };

/** Download the save stored under `input` and make this device use that ID from now on. */
export async function restore(input: string): Promise<RestoreResult> {
  const id = normalizeId(input);
  if (!id) return { ok: false, reason: "That doesn't look like a save ID." };
  let res: Response;
  try { res = await fetch(`/api/save?id=${id}`, { cache: 'no-store' }); }
  catch { return { ok: false, reason: 'No connection. Try again when online.' }; }
  if (res.status === 404) return { ok: false, reason: 'No save found for that ID.' };
  if (!res.ok) return { ok: false, reason: 'The save server had a problem. Try again.' };
  const { save: cloud } = await res.json();
  localStorage.setItem(ID_KEY, id);
  // Merge so a restore can never lose progress on either side.
  save(mergeSaves(cloud, load()));
  void backup();
  return { ok: true };
}

addEventListener('online', () => void backup());
