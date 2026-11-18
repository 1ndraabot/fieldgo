"use client";

import Button from "@/components/ui/Button";
import FormField, { inputClass } from "@/components/ui/FormField";
import { STATUSES, type StatusFilter } from "@/lib/admin-orders";

type Props = {
  query: string;
  status: StatusFilter;
  filtering: boolean;
  disabled?: boolean;
  onQuery: (q: string) => void;
  onStatus: (s: StatusFilter) => void;
  onReset: () => void;
};

/** Pencarian (kode / nama penyewa) + filter status; dapat dipakai bersamaan. */
export default function OrderToolbar({ query, status, filtering, disabled, onQuery, onStatus, onReset }: Props) {
  return (
    <div role="search" aria-label="Cari dan filter pesanan" className="flex flex-wrap items-end gap-4">
      <div className="min-w-[240px] flex-[2_1_280px]">
        <FormField id="q" label="Cari kode atau nama penyewa">
          <div className="relative">
            <input
              id="q" type="search" value={query} disabled={disabled} autoComplete="off" placeholder="Contoh: GH-7K4M atau Rani"
              onChange={(e) => onQuery(e.target.value)}
              className={`${inputClass()} !pr-12 [&::-webkit-search-cancel-button]:hidden`}
            />
            {query && (
              <button
                type="button" onClick={() => onQuery("")} aria-label="Hapus kata kunci"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-f1 text-f6"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </FormField>
      </div>
      <div className="min-w-[200px] flex-[1_1_220px]">
        <FormField id="st" label="Status">
          <select id="st" value={status} disabled={disabled} onChange={(e) => onStatus(e.target.value as StatusFilter)} className={`${inputClass()} cursor-pointer`}>
            <option value="semua">Semua status</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </FormField>
      </div>
      {filtering && (
        <div className="pb-[26px]"><Button variant="outline" size="sm" onClick={onReset}>Reset</Button></div>
      )}
    </div>
  );
}
