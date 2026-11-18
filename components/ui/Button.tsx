import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "green" | "outline" | "danger";
  size?: "md" | "sm";
};

const VARIANT = {
  green: "border-transparent bg-f5 text-white",
  outline: "border-f9 bg-white text-f9",
  danger: "border-transparent bg-[#B42328] text-white",
} as const;

/** Tombol pil standar (kelas `.btn` dari STYLE.md memberi hover dan keadaan disabled). */
export default function Button({ variant = "green", size = "md", className = "", type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      className={`btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-[1.5px] font-bold ${
        size === "md" ? "h-14 px-7 text-base" : "h-11 px-5 text-sm"
      } ${VARIANT[variant]} ${className}`}
      {...rest}
    />
  );
}
