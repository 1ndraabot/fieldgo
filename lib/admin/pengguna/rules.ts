/** Aturan murni pengelolaan pengguna admin (FR-ADM-10). */

export type PeranPengguna = 'penyewa' | 'admin';

export type TargetPengguna = {
  id: number;
  peran: PeranPengguna;
  dinonaktifkanPada: Date | null;
};

/**
 * Alasan penolakan perubahan status, atau null bila boleh.
 * Hanya akun penyewa yang dapat dinonaktifkan/diaktifkan; admin tidak bisa menonaktifkan diri sendiri.
 */
export function tolakUbahAktif(aktorId: number, target: TargetPengguna, aktif: boolean): string | null {
  if (target.peran !== 'penyewa') return 'Hanya akun penyewa yang dapat diaktifkan atau dinonaktifkan.';
  if (!aktif && target.id === aktorId) return 'Admin tidak dapat menonaktifkan akunnya sendiri.';
  if (aktif && target.dinonaktifkanPada === null) return 'Akun sudah aktif.';
  if (!aktif && target.dinonaktifkanPada !== null) return 'Akun sudah nonaktif.';
  return null;
}
