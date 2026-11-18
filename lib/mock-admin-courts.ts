import { COURTS, FILTERS } from "./data";
import { getCourtDetail } from "./court-detail";
import type { AdminCourt } from "./admin-courts";

/**
 * DATA CONTOH Admin — Kelola Lapangan (frontend saja), diturunkan dari data lapangan yang sama dengan halaman publik.
 * Ganti dengan data backend (Lapangan, FotoLapangan, Fasilitas, JenisOlahraga) saat tersedia.
 */
export type AdminCourtsData = { courts: AdminCourt[]; sports: string[]; facilities: string[] };

const PHOTO_COUNT: Record<string, number> = {
  "futsal-arena-a": 3, "badminton-court-1": 2, "basket-outdoor": 2, "tenis-lapangan-1": 2, "mini-soccer": 3, "badminton-court-2": 2,
};

export function buildAdminCourtsData(): AdminCourtsData {
  const courts: AdminCourt[] = COURTS.map((c, i) => {
    const d = getCourtDetail(c.id)!;
    const fotos = Array.from({ length: PHOTO_COUNT[c.id] ?? 2 }, (_, k) => ({ id: `${c.id}-f${k + 1}`, name: `foto-${k + 1}.jpg`, url: null, tone: (i + k) % 6 }));
    return {
      id: c.id, nama: d.name, sport: d.sport, aktif: d.active, desc: d.description, alamat: d.address,
      lat: String(d.lat), lng: String(d.lng), fotos, utamaId: fotos[0].id, fac: [...d.facilities],
    };
  });
  const facilities = ["Lampu sorot", "Kamar mandi", "Parkir luas", "Musala", "Kantin", "Ruang ganti"];
  for (const c of courts) for (const f of c.fac) if (!facilities.includes(f)) facilities.push(f);
  return { courts, sports: FILTERS.filter((f) => f !== "Semua"), facilities };
}
