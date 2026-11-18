import Image from "next/image";

/** All Musubi brand marks use the same SVG in public/brand. */
export function MusubiLogo({ size = 40, className, decorative = false }: {
  size?: number;
  className?: string;
  decorative?: boolean;
}) {
  return <Image
    src="/brand/musubi-logo.svg"
    width={size}
    height={size}
    alt={decorative ? "" : "Musubi logo"}
    aria-hidden={decorative || undefined}
    className={className}
    draggable={false}
    unoptimized
  />;
}
