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
};

/** Bentuk notifikasi yang sudah dinormalisasi dari provider apa pun. */
export type NotifikasiGateway = {
  eventKey: string;
  orderId: string;
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
  /** null = signature tidak valid / provider tidak aktif untuk request ini. */
  bacaNotifikasi(req: Request): Promise<NotifikasiGateway | null>;
  ambilStatus(orderId: string): Promise<NotifikasiGateway | null>;
  refund(orderId: string, nominal: number, alasan: string): Promise<HasilRefundGateway>;
}
