/** Route dari papan desain. Halaman selain "/" belum dibangun. */
export const ROUTES = {
  home: "/",
  court: (id: string) => `/lapangan/${id}`,
  login: "/masuk",
  register: "/daftar",
  book: "/pesan",
  mySchedule: "/jadwal-saya",
  history: "/riwayat",
  forgot: "/lupa-sandi",
} as const;

export const DEFAULT_COURT_ID = "futsal-arena-a";
