// Hapus basis data lokal; akan dibuat ulang + di-seed otomatis pada permintaan berikutnya.
import { rmSync } from "node:fs";
import { join } from "node:path";
const base = process.env.DATABASE_PATH ?? join(process.cwd(), "data", "gelanggang.db");
for (const f of [base, base + "-wal", base + "-shm"]) rmSync(f, { force: true });
console.log("Basis data dihapus:", base);
