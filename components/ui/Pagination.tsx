import Button from "./Button";

type Props = { page: number; pages: number; rangeText: string; onPrev: () => void; onNext: () => void };

/** Pagination sederhana: teks rentang + Sebelumnya/Berikutnya. */
export default function Pagination({ page, pages, rangeText, onPrev, onNext }: Props) {
  return (
    <nav aria-label="Halaman daftar" className="flex flex-wrap items-center justify-between gap-3 px-3.5 pb-1 pt-4">
      <span aria-live="polite" className="text-sm font-semibold text-muted">{rangeText}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrev}>Sebelumnya</Button>
        <span className="text-sm font-bold">Halaman {page} dari {pages}</span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={onNext}>Berikutnya</Button>
      </div>
    </nav>
  );
}
