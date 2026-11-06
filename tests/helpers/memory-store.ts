// Store dummy di memori: dipakai tes (dan bisa dipakai demo tanpa DB). Meniru perilaku store Prisma.
import { EmailSudahAda, type AuthStore, type Pengguna } from '../../lib/auth/service.ts';

type Token = { penggunaId: number; jenis: string; tokenHash: string; kedaluwarsaPada: Date; digunakanPada: Date | null };
type Sesi = { penggunaId: number; tokenHash: string; kedaluwarsaPada: Date };

export function buatMemoryStore() {
  const users: Pengguna[] = [];
  const tokens: Token[] = [];
  const sesi: Sesi[] = [];
  const store: AuthStore = {
    async cariPenggunaByEmail(email) { return users.find((u) => u.email === email) ?? null; },
    async cariPenggunaById(id) { return users.find((u) => u.id === id) ?? null; },
    async buatPengguna(d) {
      if (users.some((u) => u.email === d.email)) throw new EmailSudahAda();
      const u: Pengguna = { id: users.length + 1, ...d, peran: 'penyewa', emailTerverifikasiPada: null, dinonaktifkanPada: null };
      users.push(u);
      return u;
    },
    async buatToken(d) { tokens.push({ ...d, digunakanPada: null }); },
    async batalkanTokenAktif(penggunaId, jenis) {
      for (const t of tokens) if (t.penggunaId === penggunaId && t.jenis === jenis && !t.digunakanPada) t.digunakanPada = new Date(0);
    },
    async pakaiToken(tokenHash, jenis, now) {
      const t = tokens.find((x) => x.tokenHash === tokenHash && x.jenis === jenis && !x.digunakanPada && x.kedaluwarsaPada > now);
      if (!t) return null;
      t.digunakanPada = now;
      return t.penggunaId;
    },
    async tandaiTerverifikasi(id, now) { const u = users.find((x) => x.id === id); if (u) u.emailTerverifikasiPada = now; },
    async buatSesi(d) { sesi.push(d); },
    async cariSesi(tokenHash, now) {
      const s = sesi.find((x) => x.tokenHash === tokenHash && x.kedaluwarsaPada > now);
      return s ? users.find((u) => u.id === s.penggunaId) ?? null : null;
    },
    async hapusSesi(tokenHash) { const i = sesi.findIndex((x) => x.tokenHash === tokenHash); if (i >= 0) sesi.splice(i, 1); },
  };
  return { store, users, tokens, sesi };
}
