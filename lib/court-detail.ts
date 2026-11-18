import { COURTS, type Court } from "./data";

export type DayType = "weekday" | "weekend";
export type Tariff = { tipe: DayType; mulai: number; selesai: number; harga: number };
/** Satu baris per hari, urutan Senin–Minggu. Jam 6–24. */
export type DayHours = { buka: number; tutup: number; open: boolean };

export type CourtDetail = Court & {
  active: boolean;
  badge: string;
  reviews: number;
  description: string;
  address: string;
  lat: number;
  lng: number;
  facilities: string[];
  tariffs: Tariff[];
  hours: DayHours[];
};

const allDays = (buka: number, tutup: number): DayHours[] =>
  Array.from({ length: 7 }, () => ({ buka, tutup, open: true }));

/** Tarif standar: dua rentang (pagi–sore, malam) untuk weekday dan weekend. */
const tariffs = (wd1: number, wd2: number, we1: number, we2: number): Tariff[] => [
  { tipe: "weekday", mulai: 6, selesai: 17, harga: wd1 },
  { tipe: "weekday", mulai: 17, selesai: 24, harga: wd2 },
  { tipe: "weekend", mulai: 6, selesai: 17, harga: we1 },
  { tipe: "weekend", mulai: 17, selesai: 24, harga: we2 },
];

type Extra = Omit<CourtDetail, keyof Court>;

// Data contoh. Ganti dengan hasil query basis data (Lapangan, FotoLapangan, Tarif, JamOperasional, …).
const EXTRA: Record<string, Extra> = {
  "futsal-arena-a": {
    active: true, badge: "Lantai vinyl indoor", reviews: 312,
    description: "Lapangan futsal indoor berlantai vinyl dengan pencahayaan merata dan ruang ganti terpisah. Cocok untuk latihan rutin maupun pertandingan persahabatan.",
    address: "Jl. Sudirman No. 24", lat: -6.2146, lng: 106.8228,
    facilities: ["Lampu sorot", "Kamar mandi", "Parkir luas", "Musala", "Kantin", "Ruang ganti"],
    tariffs: tariffs(90000, 120000, 110000, 150000), hours: allDays(6, 24),
  },
  "badminton-court-1": {
    active: true, badge: "Indoor · 4 pemain", reviews: 204,
    description: "Lapangan badminton indoor berlantai karpet standar turnamen dengan pencahayaan bebas silau. Raket dan shuttlecock tersedia di kantin.",
    address: "Jl. Sudirman No. 24", lat: -6.2146, lng: 106.8228,
    facilities: ["Lantai karpet", "Kamar mandi", "Parkir luas", "Musala", "Kantin"],
    tariffs: tariffs(60000, 80000, 75000, 100000), hours: allDays(6, 24),
  },
  "basket-outdoor": {
    active: true, badge: "Outdoor · full court", reviews: 148,
    description: "Lapangan basket outdoor ukuran penuh dengan ring standar dan lampu sorot untuk bermain malam. Sirkulasi udara terbuka dan nyaman.",
    address: "Jl. Sudirman No. 24", lat: -6.2149, lng: 106.8231,
    facilities: ["Lampu sorot", "Kamar mandi", "Parkir luas", "Tribun kecil"],
    tariffs: tariffs(75000, 95000, 90000, 115000), hours: allDays(6, 22),
  },
  "tenis-lapangan-1": {
    active: true, badge: "Outdoor · hard court", reviews: 96,
    description: "Lapangan tenis hard court dengan permukaan rata dan garis yang jelas. Tersedia tempat duduk untuk pendamping.",
    address: "Jl. Sudirman No. 24", lat: -6.2149, lng: 106.8231,
    facilities: ["Lampu sorot", "Kamar mandi", "Parkir luas", "Kursi pendamping"],
    tariffs: tariffs(85000, 110000, 105000, 135000), hours: allDays(6, 22),
  },
  "mini-soccer": {
    active: true, badge: "Outdoor · rumput sintetis", reviews: 187,
    description: "Lapangan mini soccer berumput sintetis untuk tim hingga 7 lawan 7, dilengkapi pencahayaan malam dan area penonton.",
    address: "Jl. Sudirman No. 24", lat: -6.2152, lng: 106.8226,
    facilities: ["Lampu sorot", "Kamar mandi", "Parkir luas", "Musala", "Kantin", "Ruang ganti"],
    tariffs: tariffs(250000, 300000, 290000, 350000), hours: allDays(6, 24),
  },
  "badminton-court-2": {
    active: true, badge: "Indoor · 4 pemain", reviews: 131,
    description: "Lapangan badminton indoor kedua dengan standar yang sama seperti Court 1. Pilihan tepat saat Court 1 penuh.",
    address: "Jl. Sudirman No. 24", lat: -6.2146, lng: 106.8228,
    facilities: ["Lantai karpet", "Kamar mandi", "Parkir luas", "Musala", "Kantin"],
    tariffs: tariffs(60000, 80000, 75000, 100000), hours: allDays(6, 24),
  },
};

export function getCourtDetail(id: string): CourtDetail | null {
  const base = COURTS.find((c) => c.id === id);
  const extra = EXTRA[id];
  return base && extra ? { ...base, ...extra } : null;
}

export const allCourtIds = () => COURTS.map((c) => c.id);

export const minPrice = (c: CourtDetail) => Math.min(...c.tariffs.map((t) => t.harga));
