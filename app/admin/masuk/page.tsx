import type { Metadata } from "next";
import AdminLoginArt from "@/components/admin/AdminLoginArt";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "Masuk admin — Gelanggang",
  robots: { index: false, follow: false },
};

/** /admin/masuk — login admin, terpisah dari login penyewa (FR-ADM-01). */
export default function AdminLoginPage() {
  return (
    <div className="relative mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <div className="flex min-h-[900px] flex-wrap">
        <AdminLoginArt />
        <main className="relative box-border flex flex-[1_1_460px] items-center justify-center px-[clamp(16px,4.5vw,64px)] py-12">
          <div aria-hidden="true" className="absolute right-[-120px] top-[-60px] h-[380px] w-[380px] rounded-full bg-f1 opacity-90 blur-[90px]" />
          <AdminLoginForm />
        </main>
      </div>
    </div>
  );
}
