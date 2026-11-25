import type { GatewayProvider } from './types.ts';
import { fakeGateway } from './fake.ts';
import { xenditGateway } from './xendit.ts';

/** Provider yang dipilih lewat env tetapi belum dikenal. */
const providerBelumSiap: GatewayProvider = {
  nama: 'belum-siap',
  async buatTransaksi() { throw new Error('Provider gateway belum dikonfigurasi'); },
  async bacaNotifikasi() { return null; },
  async ambilStatus() { return null; },
  async refund() { return { ok: false, kode: 'BELUM_TERPASANG' }; },
};

export function pilihGateway(): GatewayProvider {
  const nama = (process.env.GATEWAY_PROVIDER ?? (process.env.NODE_ENV === 'production' ? 'xendit' : 'fake')).toLowerCase();
  // Provider simulasi tidak boleh aktif di production, bahkan bila env salah diisi.
  if (nama === 'fake' && process.env.NODE_ENV !== 'production') return fakeGateway;
  if (nama === 'xendit') return xenditGateway;
  return providerBelumSiap;
}
