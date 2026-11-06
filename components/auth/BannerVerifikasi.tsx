import Link from 'next/link';
import { Icon } from '@/components/icons';

export function BannerVerifikasi() {
  return (
    <div role="status" className="relative z-10 flex items-start gap-3.5 border-y-[1.5px] border-[#F5A524] bg-[#FFF1D6] px-[clamp(16px,4.5vw,64px)] py-3.5 text-[15px] font-semibold leading-normal text-[#5A3700]">
      <span className="mt-px shrink-0"><Icon name="alert" size={20} /></span>
      <span>Email kamu belum diverifikasi, jadi kamu belum bisa memesan. <Link href="/verifikasi-email" className="font-bold underline">Kirim ulang tautan</Link></span>
    </div>
  );
}
