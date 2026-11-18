import type { ReactNode } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { fmtRupiah } from "@/lib/data";
import { relativeTime, type OrderStatus } from "@/lib/admin-verification";
import { rangeLabel, shortLabel } from "@/lib/datetime";
import type { CancelItem, PaymentItem } from "@/lib/mock-verification";
import StatusChip from "./StatusChip";

type ColumnProps = {
  label: string;
  ariaLabel: string;
  emptyTitle: string;
  emptyText: string;
  pending: ReactNode[];
  decided: ReactNode[];
  className?: string;
};

/** Kolom antrean: kartu menunggu (terlama dulu), keadaan kosong, dan daftar yang sudah diputuskan. */
export function QueueColumn({ label, ariaLabel, emptyTitle, emptyText, pending, decided, className = "" }: ColumnProps) {
  return (
    <section aria-label={ariaLabel} className={className}>
      <div className="mb-3 text-[13px] font-bold tracking-[.04em] text-muted">{label}</div>
      {pending.length === 0 ? (
        <EmptyState title={emptyTitle}>{emptyText}</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">{pending}</div>
      )}
      {decided.length > 0 && (
        <>
          <div className="mb-3 mt-7 text-[13px] font-bold tracking-[.04em] text-muted">SUDAH DIPUTUSKAN (SESI INI)</div>
          <div className="flex flex-col gap-3">{decided}</div>
        </>
      )}
    </section>
  );
}

const cardBase = (active: boolean) =>
  `w-full cursor-pointer text-left ${active ? "border-f5 bg-white shadow-[0_14px_30px_rgba(8,44,28,.14)]" : "border-line bg-[#F7FDF9]"}`;

type PayCardProps = { item: PaymentItem; status: OrderStatus; active: boolean; nowMs: number; onClick: () => void };

export function PaymentCard({ item, status, active, nowMs, onClick }: PayCardProps) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${cardBase(active)} rounded-[28px] border-2 p-5`}>
      <span className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-bold">{item.kode}</span>
        <span className="text-xs font-semibold text-muted">{relativeTime(item.uploadedAtMs, nowMs)}</span>
      </span>
      <span className="mt-2.5 block text-base font-bold">{item.penyewa}</span>
      <span className="mt-1 block text-[13px] font-medium text-muted">
        {item.courtName} · {shortLabel(item.date)} · {rangeLabel(item.hours[0], item.hours[item.hours.length - 1] + 1)}
      </span>
      <span className="mt-3 flex items-center justify-between gap-2">
        <span className="font-display text-xl font-bold text-f5">{fmtRupiah(item.total)}</span>
        <StatusChip status={status} />
      </span>
    </button>
  );
}

type CancelCardProps = { item: CancelItem; status: OrderStatus; active: boolean; onClick: () => void };

export function CancelCard({ item, status, active, onClick }: CancelCardProps) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${cardBase(active)} rounded-[26px] border-[1.5px] px-[18px] py-4`}>
      <span className="flex items-center justify-between gap-2">
        <b className="text-[15px]">{item.kode}</b>
        <StatusChip status={status} />
      </span>
      <span className="mt-1.5 block text-sm font-semibold text-muted">
        {item.pemesan} · {item.courtName} · {shortLabel(item.date)}
      </span>
    </button>
  );
}
