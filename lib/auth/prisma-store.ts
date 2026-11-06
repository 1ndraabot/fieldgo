import { db } from '../db.ts';
import { EmailSudahAda, type AuthStore } from './service.ts';

export const prismaStore: AuthStore = {
  cariPenggunaByEmail: (email) => db.pengguna.findUnique({ where: { email } }),
  cariPenggunaById: (id) => db.pengguna.findUnique({ where: { id } }),

  async buatPengguna(data) {
    try {
      return await db.pengguna.create({ data });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') throw new EmailSudahAda(); // UNIQUE(email) dilanggar (termasuk balapan dua pendaftaran)
      throw e;
    }
  },

  async buatToken(data) { await db.tokenAkun.create({ data }); },

  async batalkanTokenAktif(penggunaId, jenis) {
    await db.tokenAkun.updateMany({ where: { penggunaId, jenis, digunakanPada: null }, data: { digunakanPada: new Date() } });
  },

  async pakaiToken(tokenHash, jenis, now) {
    // Satu UPDATE bersyarat: dua klik bersamaan hanya satu yang menang.
    const r = await db.tokenAkun.updateMany({
      where: { tokenHash, jenis, digunakanPada: null, kedaluwarsaPada: { gt: now } }, data: { digunakanPada: now },
    });
    if (r.count !== 1) return null;
    return (await db.tokenAkun.findUnique({ where: { tokenHash } }))?.penggunaId ?? null;
  },

  async tandaiTerverifikasi(id, now) { await db.pengguna.update({ where: { id }, data: { emailTerverifikasiPada: now } }); },

  async buatSesi(data) { await db.sesi.create({ data }); },

  async cariSesi(tokenHash, now) {
    const s = await db.sesi.findUnique({ where: { tokenHash }, include: { pengguna: true } });
    return s && s.kedaluwarsaPada > now ? s.pengguna : null;
  },

  async hapusSesi(tokenHash) { await db.sesi.deleteMany({ where: { tokenHash } }); },
};
