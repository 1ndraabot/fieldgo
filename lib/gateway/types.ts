export type StatusBayar =
  | 'pending'
  | 'dibayar'
  | 'gagal'
  | 'kedaluwarsa'
  | 'refund'
  | 'sebagian_refund'
  | 'perlu_tinjau';

export type ItemTransaksi = { id: string; nama: string; harga: number; jumlah: number };

/**
 * Instruksi yang dirender sendiri oleh FieldGo. QR/VA tidak perlu redirect ke
 * halaman hosted provider; e-wallet tetap membuka aplikasi penyedia.
 */
export type InstruksiPembayaran =
  | { jenis: 'qr'; nilai: string; kedaluwarsaPada: Date }
  | { jenis: 'va'; nomor: string; bank: string; kedaluwarsaPada: Date }
  | { jenis: 'redirect'; url: string; kedaluwarsaPada: Date };

export type BuatTransaksiInput = {
  orderId: string;
  kode: string;
  jumlah: number;
  namaPenyewa: string;
  email: string;
  itemDetails: ItemTransaksi[];
  kedaluwarsaPada: Date;
  selesaiUrl: string;
  /** `channel_code` Payment Requests v3 pilihan penyewa. Kosong = invoice v2 (kompatibilitas). */
  metode?: string;
  /** Kode `enabled_payments` untuk fallback invoice v2; kosong = semua metode akun gateway. */
  metodeAktif?: string[];
};

export type TransaksiGateway = {
  orderId: string;
  token: string | null;
  /** URL e-wallet; null untuk QRIS/VA yang dirender sendiri. */
  redirectUrl: string | null;
  kedaluwarsaPada: Date;
  /** ID transaksi di provider (Xendit: payment_request_id `pr-…` atau invoice id lama). */
  providerRef: string | null;
  /** `channel_code` provider (mis. QRIS, BCA_VIRTUAL_ACCOUNT, DANA). */
  metode: string | null;
  instruksi: InstruksiPembayaran | null;
};

/** Bentuk notifikasi yang sudah dinormalisasi dari provider apa pun. */
export type NotifikasiGateway = {
  eventKey: string;
  orderId: string;
  /** Xendit: payment_request_id/invoice id. Callback refund v3 memakai reference_id sebagai orderId. */
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
  /** `providerRef` = ID transaksi provider (Xendit: `pr-…` atau invoice id) bila tersedia. */
  ambilStatus(orderId: string, providerRef?: string | null): Promise<NotifikasiGateway | null>;
  refund(orderId: string, nominal: number, alasan: string, providerRef?: string | null): Promise<HasilRefundGateway>;
  /** Batalkan transaksi pending (best effort) saat penyewa berganti metode. */
  batalkan?(providerRef: string): Promise<void>;
  /**
   * [Hanya test mode] Selesaikan tagihan lewat endpoint simulasi resmi provider
   * (Xendit: POST /v3/payment_requests/{id}/simulate). Status akhir tetap dibaca
   * ulang dari provider lewat sinkron/webhook — metode ini hanya memicu.
   */
  simulasikanPembayaran?(orderId: string, providerRef: string, jumlah: number): Promise<{ ok: true } | { ok: false; kode: string }>;
}
