import { MusubiLogo } from "@/components/brand/MusubiLogo";

export function AuthBrand() {
  return (
    <header aria-label="Musubi" className="mb-6 flex items-center gap-3 sm:hidden">
      <MusubiLogo size={40} className="size-10 shrink-0" decorative />
      <div className="min-w-0">
        <p className="text-lg font-extrabold leading-6 text-brand">Musubi</p>
        <p className="text-xs font-medium text-slate-500">For campus organizations</p>
      </div>
    </header>
  );
}
