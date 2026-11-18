type Props = { checked: boolean; onChange: () => void; label: string; disabled?: boolean };

/** Sakelar (role="switch"). Terkendali: nilai `checked` hanya berubah bila induk mengubahnya. */
export default function Switch({ checked, onChange, label, disabled }: Props) {
  return (
    <label className="relative h-[30px] w-[52px] flex-none">
      <input
        type="checkbox" role="switch" checked={checked} onChange={onChange} disabled={disabled} aria-label={label}
        className="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-[#C9D6CE] transition-colors duration-[180ms] after:absolute after:left-[3px] after:top-[3px] after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow-[0_2px_6px_rgba(0,0,0,.2)] after:transition-transform after:duration-[180ms] after:content-[''] peer-checked:bg-f5 peer-checked:after:translate-x-[22px] peer-disabled:opacity-50 peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-lime motion-reduce:transition-none motion-reduce:after:transition-none"
      />
    </label>
  );
}
