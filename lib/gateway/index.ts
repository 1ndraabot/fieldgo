import type { GatewayProvider } from './types.ts';
import { fakeGateway } from './fake.ts';

/** Provider Midtrans diisi pada Sprint 5 (setelah akun sandbox siap). */
const midtransBelumSiap: GatewayProvider = {
  nama: 'midtrans',
  async buatTransaksi() { throw new Error('Midtrans belum dikonfigurasi'); },
  async bacaNotifikasi() { return null; },
  async ambilStatus() { return null; },
  async refund() { return { ok: false, kode: 'BELUM_TERPASANG' }; },
};

export function pilihGateway(): GatewayProvider {
  const nama = (process.env.GATEWAY_PROVIDER ?? (process.env.NODE_ENV === 'production' ? 'midtrans' : 'fake')).toLowerCase();
  // Provider simulasi tidak boleh aktif di production, bahkan bila env salah diisi.
  if (nama === 'fake' && process.env.NODE_ENV !== 'production') return fakeGateway;
  return midtransBelumSiap;
}
