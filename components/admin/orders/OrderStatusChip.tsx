import { STATUS_LABEL, type OrderStatus } from "@/lib/admin-orders";

const CHIP: Record<OrderStatus, string> = {
  menunggu_pembayaran: "bg-[#FFF1D6] text-[#7A4B00]",
  menunggu_verifikasi: "bg-[#D8F7F1] text-[#0B5E52]",
  terkonfirmasi: "bg-f1 text-f6",
  pengajuan_pembatalan: "bg-[#FFF1D6] text-[#7A4B00]",
  ditolak: "bg-[#FDE4E5] text-[#B42328]",
  // abu-abu seperti desain; Kedaluwarsa diberi garis putus-putus agar mudah dibedakan dari Dibatalkan
  kedaluwarsa: "border border-dashed border-[#9FB0A6] bg-[#EEF2F0] text-[#3F5247]",
  dibatalkan: "bg-[#E3EAE6] text-[#3F5247]",
  selesai: "bg-f9 text-white",
};

/** Label status pesanan dengan warna konsisten (delapan status PRD). */
export default function OrderStatusChip({ status, className = "" }: { status: OrderStatus; className?: string }) {
  return (
    <span className={`inline-flex h-[30px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-bold ${CHIP[status]} ${className}`}>
      <i aria-hidden="true" className="block h-2 w-2 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
