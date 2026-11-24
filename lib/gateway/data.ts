import { db } from '../db.ts';
import { DEMO } from '../demo.ts';
import { bacaPengaturan } from '../admin/pengaturan/data.ts';
import { getHalamanBayar, type HalamanBayar } from '../pembayaran/data.ts';
import { statusTampil } from '../riwayat/rules.ts';
import { pilihGateway } from './index.ts';
import { instruksiDariTransaksi, kanalAktif, type KanalBayar } from './kanal.ts';
import { simulasiTestAktif } from './rules.ts';
import type { InstruksiPembayaran, StatusBayar } from './types.ts';

export type TransaksiRingkas = {
  orderId: string;
  token: string | null;
  redirectUrl: string | null;
  status: StatusBayar;
  kedaluwarsaPada: Date | null;
  metode: string | null;
  instruksi: InstruksiPembayaran | null;
};

export type HalamanBayarGateway = HalamanBayar & {
  transaksi: TransaksiRingkas | null;
  /** Kanal yang boleh dipilih penyewa sesuai Pengaturan admin. */
  kanal: KanalBayar[];
  modeSimulasi: boolean;
  /** [Hanya pengembangan] Xendit test mode: tombol simulasi pembayaran resmi tersedia. */
  simulasiTest: boolean;
  gatewayAktif: boolean;
};

const pilihTransaksi = {
  orderId: true, token: true, redirectUrl: true, status: true, kedaluwarsaPada: true, metode: true,
} as const;

/** Halaman pembayaran penyewa + transaksi gateway terakhir (jika ada). */
export async function getHalamanBayarGateway(kode: string, penggunaId: number): Promise<HalamanBayarGateway | null> {
  const base = await getHalamanBayar(kode, penggunaId);
  if (!base) return null;
  const { gatewayAktif, metodeAktif } = await bacaPengaturan();
  const kanal = kanalAktif(metodeAktif);
  if (DEMO) return { ...base, transaksi: null, kanal, modeSimulasi: false, simulasiTest: false, gatewayAktif }; // tanpa database: tombol bayar → 503 MODE_DEMO

  const p = await db.pesanan.findFirst({
    where: { kodePesanan: kode, penggunaId },
    select: {
      pembayaranGateway: { orderBy: { dibuatPada: 'desc' }, take: 1, select: pilihTransaksi },
    },
  });
  const t = p?.pembayaranGateway[0];
  return {
    ...base,
    transaksi: t
      ? {
          ...t,
          instruksi: t.kedaluwarsaPada
            ? instruksiDariTransaksi({
                metode: t.metode, token: t.token, redirectUrl: t.redirectUrl, kedaluwarsaPada: t.kedaluwarsaPada,
              })
            : null,
        }
      : null,
    kanal,
    modeSimulasi: pilihGateway().nama === 'fake',
    simulasiTest: simulasiTestAktif({
      provider: (process.env.GATEWAY_PROVIDER ?? 'xendit').toLowerCase(),
      secretKey: process.env.XENDIT_SECRET_KEY,
      nodeEnv: process.env.NODE_ENV,
    }),
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
