import { db } from '../db.ts';
import { DEMO } from '../demo.ts';
import { bacaPengaturan } from '../admin/pengaturan/data.ts';
import { getHalamanBayar, type HalamanBayar } from '../pembayaran/data.ts';
import { statusTampil } from '../riwayat/rules.ts';
import { pilihGateway } from './index.ts';
import type { StatusBayar } from './types.ts';

export type TransaksiRingkas = {
  orderId: string;
  token: string | null;
  redirectUrl: string;
  status: StatusBayar;
  kedaluwarsaPada: Date | null;
};

export type HalamanBayarGateway = HalamanBayar & {
  transaksi: TransaksiRingkas | null;
  modeSimulasi: boolean;
  gatewayAktif: boolean;
};

const pilihTransaksi = {
  orderId: true, token: true, redirectUrl: true, status: true, kedaluwarsaPada: true,
} as const;

/** Halaman pembayaran penyewa + transaksi gateway terakhir (jika ada). */
export async function getHalamanBayarGateway(kode: string, penggunaId: number): Promise<HalamanBayarGateway | null> {
  const base = await getHalamanBayar(kode, penggunaId);
  if (!base) return null;
  const { gatewayAktif } = await bacaPengaturan();
  if (DEMO) return { ...base, transaksi: null, modeSimulasi: false, gatewayAktif }; // tanpa database: tombol bayar → 503 MODE_DEMO

  const p = await db.pesanan.findFirst({
    where: { kodePesanan: kode, penggunaId },
    select: {
      pembayaranGateway: { orderBy: { dibuatPada: 'desc' }, take: 1, select: pilihTransaksi },
    },
  });
  const t = p?.pembayaranGateway[0];
  return {
    ...base,
    transaksi: t && t.redirectUrl ? { ...t, redirectUrl: t.redirectUrl } : null,
    modeSimulasi: pilihGateway().nama === 'fake',
    gatewayAktif,
  };
}

/** Status ringkas untuk polling; `status` sudah memperhitungkan batas bayar yang lewat. */
export async function getStatusPembayaran(kode: string, penggunaId: number, now = new Date()) {
  if (DEMO) return { status: 'menunggu_pembayaran' as const, statusBayar: null, dibayarPada: null };

  const p = await db.pesanan.findFirst({
    where: { kodePesanan: kode, penggunaId },
    select: {
      status: true,
      batasBayarPada: true,
      pembayaranGateway: {
        orderBy: { dibuatPada: 'desc' }, take: 1,
        select: { status: true, dibayarPada: true },
      },
    },
  });
  if (!p) return null;
  const t = p.pembayaranGateway[0];
  return {
    status: statusTampil(p.status, p.batasBayarPada, now),
    statusBayar: t?.status ?? null,
    dibayarPada: t?.dibayarPada ?? null,
  };
}
