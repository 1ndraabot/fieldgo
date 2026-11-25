import { batasiTanggal, MAKS_HARI_MUKA, wibSekarang } from '@/lib/format';
import { getHalamanLapangan } from '@/lib/lapangan-data';
import { parseBerandaParams } from '@/lib/params';

export const dynamic = 'force-dynamic'; // status slot harus selalu terbaru (PRD Bagian 6)

const ID = /^\d{1,4}$/;

/**
 * Slot satu tanggal untuk kalender klien (ganti tanggal tanpa reload halaman).
 * Tanggal tidak dipercaya: dijepit ke [hari ini, hari ini + 30] — sama dengan batas di UI.
 * Data publik (FR-PUB-04); mode DEMO ikut ditangani getHalamanLapangan.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id)) return Response.json({ ok: false, kode: 'TIDAK_DITEMUKAN' }, { status: 404 });

  const now = new Date();
  const hariIni = wibSekarang(now).tanggal;
  const { tanggal: diminta } = parseBerandaParams({ tanggal: new URL(req.url, 'http://localhost').searchParams.get('tanggal') ?? undefined }, hariIni);
  const tanggal = batasiTanggal(diminta, hariIni, MAKS_HARI_MUKA);
  const halaman = await getHalamanLapangan(Number(id), tanggal, now);
  if (!halaman) return Response.json({ ok: false, kode: 'TIDAK_DITEMUKAN' }, { status: 404 });

  return Response.json({ ok: true, tanggal, slot: halaman.slot });
}
