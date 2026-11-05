/** Pilihan jam selalu satu blok berurutan (BR-03). `tersedia` = jam mulai yang bisa dipesan. */
export function toggleJam(selected: number[], jam: number, tersedia: number[]): number[] {
  if (!tersedia.includes(jam)) return selected;
  if (selected.length === 0) return [jam];
  const min = selected[0];
  const max = selected[selected.length - 1];
  if (selected.includes(jam)) {
    if (jam === max) return selected.slice(0, -1);
    if (jam === min) return selected.slice(1);
    return [jam]; // klik di tengah: mulai ulang agar tetap berurutan
  }
  if (jam === min - 1) return [jam, ...selected];
  if (jam === max + 1) return [...selected, jam];
  return [jam];
}
