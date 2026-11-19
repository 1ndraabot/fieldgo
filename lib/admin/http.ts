export const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

/** Detail galat hanya di log; klien menerima kode umum. */
export function galatServer(label: string, e: unknown): Response {
  console.error(`[${label}] galat tak terduga`, e);
  return json(500, { ok: false, kode: 'GALAT_SERVER' });
}

/** Pertahanan CSRF bersama cookie SameSite=Lax: mutasi wajib JSON. */
export const wajibJson = (req: Request): boolean =>
  (req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json');

export async function bacaJson(req: Request): Promise<{ ok: true; body: unknown } | { ok: false; respons: Response }> {
  if (!wajibJson(req)) return { ok: false, respons: json(415, { ok: false, kode: 'MEDIA_TIDAK_DIDUKUNG' }) };
  try {
    return { ok: true, body: await req.json() };
  } catch {
    return { ok: false, respons: json(400, { ok: false, kode: 'JSON_RUSAK' }) };
  }
}
