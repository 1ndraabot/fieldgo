"use client";

import { useState, type FormEvent, type ReactNode } from "react";

export default function NewsletterForm({ icon }: { icon: ReactNode }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // TODO: hubungkan ke endpoint langganan saat backend tersedia.
    setSent(true);
    setEmail("");
  };

  return (
    <form onSubmit={onSubmit} className="max-w-[380px] flex-[1_1_300px]">
      <label htmlFor="email" className="mb-4 block font-display text-base font-bold">
        Info jadwal &amp; promo
      </label>
      <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/[.08] py-1.5 pl-[22px] pr-1.5">
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); setSent(false); }}
          placeholder="Alamat email"
          className="h-11 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-white outline-none placeholder:text-white/50"
        />
        <button
          type="submit"
          aria-label="Kirim email"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-lime"
        >
          {icon}
        </button>
      </div>
      <p role="status" className="mt-3 min-h-[20px] text-[13px] text-white/75">
        {sent ? "Terima kasih, email kamu sudah tercatat." : ""}
      </p>
    </form>
  );
}
