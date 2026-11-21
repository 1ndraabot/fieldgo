import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { Storage } from './pembayaran/service.ts';

const BUCKET = process.env.BUKTI_BUCKET ?? 'bukti-pembayaran'; // bucket PRIVAT

/** Supabase Storage lewat REST dari server (kunci service-role hanya di server). Bukan PostgREST. */
function supabase(url: string, kunci: string): Storage {
  const h = { Authorization: `Bearer ${kunci}`, apikey: kunci };
  const alamat = (k: string) => `${url}/storage/v1/object/${BUCKET}/${k.split('/').map(encodeURIComponent).join('/')}`;
  return {
    async simpan(k, isi, tipe) {
      const r = await fetch(alamat(k), { method: 'POST', headers: { ...h, 'content-type': tipe, 'x-upsert': 'false' }, body: new Uint8Array(isi) });
      if (!r.ok) throw new Error(`Storage gagal menyimpan (${r.status})`);
    },
    async hapus(k) {
      const r = await fetch(alamat(k), { method: 'DELETE', headers: h });
      if (!r.ok && r.status !== 404) throw new Error(`Storage gagal menghapus (${r.status})`);
    },
  };
}

/** Dummy untuk pengembangan: berkas ke ./.data (di luar git). Tidak dipakai di produksi. */
function lokal(): Storage {
  const akar = resolve(process.cwd(), '.data');
  return {
    async simpan(k, isi) { const p = join(akar, k); await mkdir(dirname(p), { recursive: true }); await writeFile(p, isi, { flag: 'wx' }); },
    async hapus(k) { await rm(join(akar, k), { force: true }); },
  };
}

export function buatStorage(): Storage {
  const url = process.env.SUPABASE_URL, kunci = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && kunci) return supabase(url.replace(/\/$/, ''), kunci);
  if (process.env.NODE_ENV === 'production') throw new Error('Storage bukti belum dikonfigurasi (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  return lokal();
}
