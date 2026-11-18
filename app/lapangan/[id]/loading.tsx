export default function Loading() {
  return (
    <div className="mx-auto max-w-[1312px] px-[clamp(16px,4.5vw,64px)] py-10" aria-busy="true" aria-label="Memuat detail lapangan">
      <div className="skel h-16 w-2/3" />
      <div className="skel mt-9 aspect-[780/440] w-full !rounded-[44px]" />
      <div className="mt-14 flex flex-wrap gap-14">
        <div className="flex flex-[1_1_520px] flex-col gap-6">
          <div className="skel h-8 w-40" />
          <div className="skel h-24 w-full" />
        </div>
        <div className="skel h-[620px] flex-[1_1_440px] !rounded-[40px]" />
      </div>
    </div>
  );
}
