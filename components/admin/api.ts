export type HasilApi = { ok: boolean; kode?: string; pesan?: string; data?: unknown; bentrok?: unknown };

/** Pemanggil API admin: selalu JSON (pertahanan CSRF) dan pesan galat siap tampil. */
export async function kirimApi(url: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?: unknown): Promise<HasilApi> {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const b = await res.json().catch(() => ({})) as HasilApi;
    if (!res.ok) {
      return {
        ok: false,
        kode: b.kode,
        pesan: b.pesan ?? (res.status === 401 ? 'Sesi admin sudah berakhir. Silakan masuk lagi.' : 'Perubahan gagal disimpan.'),
        bentrok: b.bentrok,
      };
    }
    return { ...b, ok: true };
  } catch {
    return { ok: false, pesan: 'Belum bisa terhubung ke server. Coba lagi sebentar lagi.' };
  }
}
