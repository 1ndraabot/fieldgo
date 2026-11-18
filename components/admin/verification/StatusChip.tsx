import type { OrderStatus } from "@/lib/admin-verification";

const CHIP: Record<OrderStatus, { label: string; cls: string }> = {
  menunggu_verifikasi: { label: "Menunggu verifikasi", cls: "bg-[#FFF1D6] text-[#7A4B00]" },
  pengajuan_pembatalan: { label: "Pengajuan pembatalan", cls: "bg-[#FFF1D6] text-[#7A4B00]" },
  terkonfirmasi: { label: "Terkonfirmasi", cls: "bg-f1 text-f6" },
  ditolak: { label: "Ditolak", cls: "bg-[#FDE4E5] text-[#B42328]" },
  dibatalkan: { label: "Dibatalkan", cls: "bg-[#E3EAE6] text-[#3F5247]" },
};

export default function StatusChip({ status, className = "" }: { status: OrderStatus; className?: string }) {
  const c = CHIP[status];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-[5px] text-xs font-bold ${c.cls} ${className}`}>{c.label}</span>;
}
