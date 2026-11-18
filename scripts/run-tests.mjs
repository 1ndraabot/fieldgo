// Menjalankan tes backend dengan Node (type-stripping). Import tanpa ekstensi (gaya Next)
// ditulis ulang ke salinan sementara agar Node bisa meresolusinya; sumber tidak diubah.
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const tmp = mkdtempSync(join(tmpdir(), "gh-test-"));
for (const d of ["lib", "tests"]) cpSync(join(root, d), join(tmp, d), { recursive: true });

const rewrite = (file) => {
  const s = readFileSync(file, "utf8").replace(/(from\s+|import\()\s*"(\.{1,2}\/[^"]+?)(?<!\.ts)"/g, '$1"$2.ts"');
  writeFileSync(file, s);
};
const walk = (d) => readdirSync(d).forEach((n) => {
  const p = join(d, n);
  statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") && rewrite(p);
});
walk(join(tmp, "lib")); walk(join(tmp, "tests"));

const files = readdirSync(join(tmp, "tests")).filter((f) => f.endsWith(".test.ts")).map((f) => join(tmp, "tests", f));
const r = spawnSync(process.execPath, ["--test", "--no-warnings", ...files],
  { stdio: "inherit", env: { ...process.env, DATABASE_PATH: join(tmp, "test.db") } });
rmSync(tmp, { recursive: true, force: true });
process.exit(r.status ?? 1);
