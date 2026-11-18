import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        f9: "#0B2B1E", // hijau hutan gelap (teks, permukaan gelap)
        f8: "#134230", // watermark & panel gelap sekunder
        f7: "#1C5A40",
        f6: "#0A6B3A", // teks hijau pada chip terang
        f5: "#0E8A4A", // aksi utama
        f4: "#16A05A", // aksen / logo
        f3: "#22C06B", // permukaan lapangan
        f1: "#DDF7E8", // chip & ikon terang
        f0: "#F2FCF6", // latar seksi terang
        line: "#D7EBDF",
        muted: "#5B7266",
        lime: "#C6F432",
        "lime-soft": "#E6F9A6",
        mint: "#A7F0E0",
        star: "#F5A524",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-sora)", "sans-serif"],
      },
      screens: { m: { max: "980px" } },
    },
  },
  plugins: [],
};
export default config;
