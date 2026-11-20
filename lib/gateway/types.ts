export type StatusBayar =
  | 'pending'
  | 'dibayar'
  | 'gagal'
  | 'kedaluwarsa'
  | 'refund'
  | 'sebagian_refund'
  | 'perlu_tinjau';

export type ItemTransaksi = { id: string; nama: string; harga: number; jumlah: number };

export type BuatTransaksiInput = {
  orderId: string;
  kode: string;
  jumlah: number;
  namaPenyewa: string;
  email: string;
  itemDetails: ItemTransaksi[];
  kedaluwarsaPada: Date;
  selesaiUrl: string;
  /** Kode `enabled_payments`; kosong = semua metode yang aktif di akun gateway. */
  metodeAktif?: string[];
};

export type TransaksiGateway = {
  orderId: string;
  token: string | null;
  redirectUrl: string;
  kedaluwarsaPada: Date;
  /** ID transaksi di provider (Xendit: invoice id), dipakai untuk refund & sinkron. */
  providerRef: string | null;
};

/** Bentuk notifikasi yang sudah dinormalisasi dari provider apa pun. */
export type NotifikasiGateway = {
  eventKey: string;
  orderId: string;
  /** Xendit: invoice id. Callback refund hanya membawa referensi ini, tanpa external_id. */
  providerRef?: string | null;
  tipe: 'pembayaran' | 'refund';
  status: StatusBayar;
  metode: string | null;
  jumlah: number | null;
  waktuBayar: Date | null;
  payload: unknown;
};

export type HasilRefundGateway =
  | { ok: true; reference: string }
  | { ok: false; kode: string };

export interface GatewayProvider {
  readonly nama: string;
  buatTransaksi(i: BuatTransaksiInput): Promise<TransaksiGateway>;
  /** null = signature/token callback tidak valid / provider tidak aktif untuk request ini. */
  bacaNotifikasi(req: Request): Promise<NotifikasiGateway | null>;
  /** `providerRef` = ID transaksi provider (Xendit: invoice id) bila tersedia. */
  ambilStatus(orderId: string, providerRef?: string | null): Promise<NotifikasiGateway | null>;
  refund(orderId: string, nominal: number, alasan: string, providerRef?: string | null): Promise<HasilRefundGateway>;
}
