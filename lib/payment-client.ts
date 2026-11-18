/**
 * PENGGANTI SEMENTARA untuk pemanggilan backend. Hanya simulasi di browser: TIDAK ada yang dikirim
 * atau disimpan. Ganti isinya dengan fetch ke API (unggah bukti, batalkan pesanan) saat backend siap.
 */
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function submitProof(_kode: string, _file: File): Promise<{ status: "menunggu_verifikasi" }> {
  await delay(1100);
  return { status: "menunggu_verifikasi" };
}

export async function cancelOrder(_kode: string): Promise<{ status: "dibatalkan" }> {
  await delay(800);
  return { status: "dibatalkan" };
}
