import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword } from '../lib/auth/crypto.ts';
import { buatLimiter } from '../lib/auth/ratelimit.ts';
import { masuk, type AuthDeps } from '../lib/auth/service.ts';
import { buatHandlersRiwayat } from '../lib/riwayat/handlers.ts';
import { bisaAjukanBatal, statusTampil, validasiAjuan } from '../lib/riwayat/rules.ts';
import { AjuanSchema } from '../lib/riwayat/schema.ts';
import { ajukanPembatalan, type PesananAjuan, type RiwayatStore } from '../lib/riwayat/service.ts';
import { buatMemoryStore as buatAuthMemoryStore } from './helpers/memory-store.ts';

// 18 Nov 2026 = Rabu, 09.00 WIB.
const NOW = new Date('2026-11-18T02:00:00Z');
const BESOK = '2026-11-19';
const DUA_HARI = '2026-11-20';
const HARI_INI = '2026-11-18';

// ─── Aturan murni ───────────────────────────────────────────────────────────

test('statusTampil: menunggu pembayaran yang lewat batas tampil kedaluwarsa (BR-09)', () => {
  const lewat = new Date(NOW.getTime() - 60_000);
  const nanti = new Date(NOW.getTime() + 60_000);
  assert.equal(statusTampil('menunggu_pembayaran', lewat, NOW), 'kedaluwarsa');
  assert.equal(statusTampil('menunggu_pembayaran', nanti, NOW), 'menunggu_pembayaran');
  assert.equal(statusTampil('terkonfirmasi', lewat, NOW), 'terkonfirmasi');
  assert.equal(statusTampil('menunggu_verifikasi', lewat, NOW), 'menunggu_verifikasi');
  assert.equal(statusTampil('menunggu_pembayaran', null, NOW), 'menunggu_pembayaran');
});

test('bisaAjukanBatal: hanya Terkonfirmasi dan paling lambat H-1 (BR-12)', () => {
  assert.equal(bisaAjukanBatal('terkonfirmasi', DUA_HARI, NOW), true);
  assert.equal(bisaAjukanBatal('terkonfirmasi', BESOK, NOW), true);
  assert.equal(bisaAjukanBatal('terkonfirmasi', HARI_INI, NOW), false); // tanggal main = hari ini
  assert.equal(bisaAjukanBatal('terkonfirmasi', '2026-11-17', NOW), false);
  assert.equal(bisaAjukanBatal('menunggu_verifikasi', DUA_HARI, NOW), false);
  assert.equal(bisaAjukanBatal('pengajuan_pembatalan', DUA_HARI, NOW), false);
});

test('validasiAjuan: alasan minimal 10 karakter dan data rekening wajib (FR-CAN-02)', () => {
  assert.deepEqual(validasiAjuan({ alasan: 'Turnamen dibatalkan.', namaBank: 'BCA', nomorRekening: '1234 567 890', atasNama: 'Rani Putri' }), {});
  assert.ok(validasiAjuan({ alasan: 'pendek', namaBank: 'BCA', nomorRekening: '1234', atasNama: 'Rani' }).alasan);
  assert.ok(validasiAjuan({ alasan: 'Turnamen dibatalkan.', namaBank: ' ', nomorRekening: '1234', atasNama: 'Rani' }).namaBank);
  assert.ok(validasiAjuan({ alasan: 'Turnamen dibatalkan.', namaBank: 'BCA', nomorRekening: '', atasNama: 'Rani' }).nomorRekening);
  assert.ok(validasiAjuan({ alasan: 'Turnamen dibatalkan.', namaBank: 'BCA', nomorRekening: '12ab34', atasNama: 'Rani' }).nomorRekening);
  assert.ok(validasiAjuan({ alasan: 'Turnamen dibatalkan.', namaBank: 'BCA', nomorRekening: '12345', atasNama: ' ' }).atasNama);
});

// ─── Service ────────────────────────────────────────────────────────────────

function buatStore(awal: PesananAjuan | null) {
  let pesanan = awal;
  const tersimpan: Parameters<RiwayatStore['ajukan']>[0][] = [];
  const store: RiwayatStore = {
    async cariPesananMilik(_kode, penggunaId) {
      return pesanan && pesanan.penggunaId === penggunaId ? pesanan : null;
    },
    async ajukan(d) {
      if (!pesanan || pesanan.status !== 'terkonfirmasi' || pesanan.sudahDiajukan) return false;
      tersimpan.push(d);
      pesanan = { ...pesanan, status: 'pengajuan_pembatalan', sudahDiajukan: true };
      return true;
    },
  };
  return { store, tersimpan };
}

const AJUAN = { alasan: 'Turnamen dibatalkan karena cuaca.', namaBank: 'BCA', nomorRekening: '1234 567 890', atasNama: 'Rani Putri' };
const PESANAN: PesananAjuan = { id: 10, penggunaId: 7, status: 'terkonfirmasi', tanggal: DUA_HARI, sudahDiajukan: false };

const ajukanDengan = (pesanan: PesananAjuan | null, ajuan = AJUAN, kode = 'FGO-UJI01') => {
  const s = buatStore(pesanan);
  return ajukanPembatalan({ store: s.store, sekarang: () => NOW }, {
    penggunaId: 7, kode, namaPemesan: 'Rani Putri', kontak: '081200000000', ajuan,
  }).then((hasil) => ({ ...s, hasil }));
};

test('ajukanPembatalan: kepemilikan, status, H-1, satu pengajuan, lalu transaksi (FR-CAN-01…04)', async () => {
  assert.deepEqual((await ajukanDengan(null)).hasil, { ok: false, kode: 'TIDAK_DITEMUKAN' });
  assert.deepEqual((await ajukanDengan({ ...PESANAN, penggunaId: 99 })).hasil, { ok: false, kode: 'TIDAK_DITEMUKAN' });

  assert.deepEqual((await ajukanDengan({ ...PESANAN, status: 'menunggu_verifikasi' })).hasil, { ok: false, kode: 'STATUS_BERUBAH' });
  assert.deepEqual((await ajukanDengan({ ...PESANAN, status: 'pengajuan_pembatalan' })).hasil, { ok: false, kode: 'SUDAH_DIAJUKAN' });
  assert.deepEqual((await ajukanDengan({ ...PESANAN, sudahDiajukan: true })).hasil, { ok: false, kode: 'SUDAH_DIAJUKAN' });
  assert.deepEqual((await ajukanDengan({ ...PESANAN, tanggal: HARI_INI })).hasil, { ok: false, kode: 'LEWAT_BATAS' });

  const validasi = await ajukanDengan(PESANAN, { ...AJUAN, alasan: 'pendek' });
  assert.equal(validasi.hasil.ok, false);
  if (!validasi.hasil.ok && validasi.hasil.kode === 'VALIDASI') assert.ok(validasi.hasil.galat.alasan);
  else assert.fail('harus VALIDASI');
  assert.equal(validasi.tersimpan.length, 0);

  const sukses = await ajukanDengan(PESANAN, { ...AJUAN, alasan: '  Turnamen dibatalkan karena cuaca.  ', nomorRekening: ' 1234 567 890 ' });
  assert.deepEqual(sukses.hasil, { ok: true });
  assert.equal(sukses.tersimpan.length, 1);
  assert.deepEqual(sukses.tersimpan[0], {
    pesananId: 10, penggunaId: 7, namaPemesan: 'Rani Putri', kontak: '081200000000',
    alasan: 'Turnamen dibatalkan karena cuaca.', namaBank: 'BCA',
    nomorRekening: '1234 567 890', atasNama: 'Rani Putri', now: NOW,
  });
});

// ─── Handler HTTP ───────────────────────────────────────────────────────────

async function siapkanHandler(pesanan: PesananAjuan | null = PESANAN) {
  const authStore = buatAuthMemoryStore();
  const authDeps: AuthDeps = { store: authStore.store, baseUrl: 'http://app.test', sekarang: () => NOW, mailer: { kirim: async () => {} } };
  authStore.users.push(
    { id: 7, nama: 'Rani Putri', email: 'rani@email.com', kataSandi: await hashPassword('Lapangan24!'), nomorKontak: '081200000000', peran: 'penyewa', emailTerverifikasiPada: NOW, dinonaktifkanPada: null },
    { id: 8, nama: 'Bima', email: 'bima@email.com', kataSandi: await hashPassword('Lapangan24!'), nomorKontak: '081298765432', peran: 'penyewa', emailTerverifikasiPada: NOW, dinonaktifkanPada: null },
  );
  const token = async (email: string) => {
    const r = await masuk(authDeps, { email, kataSandi: 'Lapangan24!', peran: 'penyewa' });
    assert.ok(r.ok);
    return (r as { token: string }).token;
  };
  const s = buatStore(pesanan);
  const h = buatHandlersRiwayat({
    store: s.store, sekarang: () => NOW, auth: authDeps, skema: AjuanSchema,
    limiter: { ajuan: buatLimiter({ maks: 100, jendelaMs: 60_000, sekarang: () => NOW.getTime() }) },
  });
  return { h, token, tersimpan: s.tersimpan };
}

const req = (body: unknown, token?: string, tipe = 'application/json') => new Request('http://app.test/api/pesanan/FGO-UJI01/batal-ajuan', {
  method: 'POST',
  headers: { 'content-type': tipe, ...(token ? { cookie: `sesi=${token}` } : {}) },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const KODE = 'FGO-UJI01';
const BODY = { alasan: 'Turnamen dibatalkan karena cuaca.', namaBank: 'BCA', nomorRekening: '1234 567 890', atasNama: 'Rani Putri' };

test('handler batal-ajuan: 401 tamu, 415 non-JSON, 404 kode salah, 400 validasi, 404 bukan pemilik', async () => {
  const s = await siapkanHandler();
  const token = await s.token('rani@email.com');
  assert.equal((await s.h.ajukan(req(BODY), KODE)).status, 401);
  assert.equal((await s.h.ajukan(req(BODY, token, 'text/plain'), KODE)).status, 415);
  assert.equal((await s.h.ajukan(req(BODY, token), 'bukan kode!')).status, 404);

  const salah = await s.h.ajukan(req({ ...BODY, alasan: 'pendek' }, token), KODE);
  assert.equal(salah.status, 400);
  assert.equal((await salah.json()).kode, 'VALIDASI');

  const orangLain = await s.h.ajukan(req(BODY, await s.token('bima@email.com')), KODE);
  assert.equal(orangLain.status, 404); // kepemilikan di kueri: pesanan orang lain = tidak ada
  assert.equal(s.tersimpan.length, 0);
});

test('handler batal-ajuan: 200 lalu 409 untuk pengajuan kedua (FR-CAN-04)', async () => {
  const s = await siapkanHandler();
  const token = await s.token('rani@email.com');
  const a = await s.h.ajukan(req(BODY, token), KODE);
  assert.equal(a.status, 200);
  assert.deepEqual(await a.json(), { ok: true });
  assert.equal(s.tersimpan.length, 1);

  const b = await s.h.ajukan(req(BODY, token), KODE);
  assert.equal(b.status, 409);
  assert.equal((await b.json()).kode, 'SUDAH_DIAJUKAN');
});

test('handler batal-ajuan: 409 saat status berubah atau batas H-1 lewat', async () => {
  const bukan = await siapkanHandler({ ...PESANAN, status: 'menunggu_pembayaran' });
  const r1 = await bukan.h.ajukan(req(BODY, await bukan.token('rani@email.com')), KODE);
  assert.equal(r1.status, 409);
  assert.equal((await r1.json()).kode, 'STATUS_BERUBAH');

  const telat = await siapkanHandler({ ...PESANAN, tanggal: HARI_INI });
  const r2 = await telat.h.ajukan(req(BODY, await telat.token('rani@email.com')), KODE);
  assert.equal(r2.status, 409);
  assert.equal((await r2.json()).kode, 'LEWAT_BATAS');
});
