// One private blob per save ID: saves/<ID>.json. No accounts, no personal data.
//   GET  /api/save?id=<ID>        → the stored save, or 404
//   PUT  /api/save  {id, save}    → merges with the stored copy level by level,
//                                   always responds with the merged save.
import { get, put } from '@vercel/blob';
import { normalizeId, mergeSaves, MAX_SAVE_BYTES } from '../src/saveid.js';

// Preview/branch deploys keep their own copies so testing never touches real saves.
const PREFIX = process.env.VERCEL_ENV === 'production' ? 'saves' : 'preview/saves';
const path = (id: string) => `${PREFIX}/${id}.json`;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

async function read(id: string): Promise<Record<string, unknown> | null> {
  const r = await get(path(id), { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return null;
  // Anything over the limit predates the caps; treat it as absent rather than load it.
  if (r.blob.size > MAX_SAVE_BYTES) { void r.stream.cancel(); return null; }
  try { return JSON.parse(await new Response(r.stream).text()); } catch { return null; }
}

export async function GET(req: Request) {
  const id = normalizeId(new URL(req.url).searchParams.get('id') ?? '');
  if (!id) return json({ error: 'bad id' }, 400);
  const save = await read(id);
  return save ? json({ id, save }) : json({ error: 'not found' }, 404);
}

export async function PUT(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_SAVE_BYTES) return json({ error: 'too large' }, 413);
  let body: { id?: string; save?: Record<string, unknown> };
  try { body = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400); }
  const id = normalizeId(body.id ?? '');
  const save = body.save;
  if (!id || !save || typeof save !== 'object' || !save.best || typeof save.best !== 'object')
    return json({ error: 'bad save' }, 400);
  const existing = await read(id);
  const merged = mergeSaves(save, existing ?? {});
  if (existing && JSON.stringify(merged) === JSON.stringify(existing)) return json({ id, save: existing, kept: 'cloud' });
  const out = JSON.stringify(merged);
  if (out.length > MAX_SAVE_BYTES) return json({ error: 'too large' }, 413);
  await put(path(id), out, {
    access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json',
  });
  return json({ id, save: merged, kept: 'merged' });
}
