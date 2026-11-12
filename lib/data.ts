export const fmtRupiah = (n: number) =>
  "Rp " + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export type CourtKind = "futsal" | "badminton" | "basket" | "tenis";

export type Court = {
  id: string;
  name: string;
  sport: string;
  price: number;
  base: string;
  line: string;
  kind: CourtKind;
  rating: string;
  meta: string;
  hot?: boolean;
};

export const SPORTS = ["Futsal", "Badminton", "Basket", "Tenis", "Mini Soccer"];
export const FILTERS = ["Semua", "Futsal", "Badminton", "Basket", "Tenis", "Mini soccer"];

export const COURTS: Court[] = [
  { id: "futsal-arena-a", name: "Futsal Arena A", sport: "Futsal", price: 90000, base: "#22C06B", line: "#FFFFFF", kind: "futsal", rating: "4.9", meta: "Indoor · lantai vinyl", hot: true },
  { id: "badminton-court-1", name: "Badminton Court 1", sport: "Badminton", price: 60000, base: "#C6F432", line: "#0B2B1E", kind: "badminton", rating: "4.8", meta: "Indoor · 4 pemain" },
  { id: "basket-outdoor", name: "Basket Outdoor", sport: "Basket", price: 75000, base: "#1C5A40", line: "#C6F432", kind: "basket", rating: "4.7", meta: "Outdoor · full court" },
  { id: "tenis-lapangan-1", name: "Tenis Lapangan 1", sport: "Tenis", price: 85000, base: "#A7F0E0", line: "#0B2B1E", kind: "tenis", rating: "4.8", meta: "Outdoor · hard court" },
  { id: "mini-soccer", name: "Mini Soccer", sport: "Mini soccer", price: 250000, base: "#16A05A", line: "#FFFFFF", kind: "futsal", rating: "4.9", meta: "Outdoor · rumput sintetis" },
  { id: "badminton-court-2", name: "Badminton Court 2", sport: "Badminton", price: 60000, base: "#DDF7E8", line: "#0A6B3A", kind: "badminton", rating: "4.6", meta: "Indoor · 4 pemain" },
];

/** Slot untuk kartu interaktif di hero: x = terisi, a = tersedia */
export const HERO_SLOTS: [string, "x" | "a"][] = [
  ["18.00", "x"], ["19.00", "x"], ["20.00", "a"], ["21.00", "a"], ["22.00", "a"], ["23.00", "a"],
];
export const HERO_PRICE_PER_HOUR = 150000;

/** Grid jam 06.00–23.00: n tidak tersedia, a tersedia, x terisi, h ditahan */
export const GRID_STATES = ["n","a","a","a","x","x","a","a","h","a","a","a","x","x","x","a","a","a"] as const;
