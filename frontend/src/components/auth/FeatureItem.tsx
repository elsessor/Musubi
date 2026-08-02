type FeatureItemProps = {
  icon: "bolt" | "users" | "chart";
  title: string;
  description: string;
};

function FeatureIcon({ icon }: { icon: FeatureItemProps["icon"] }) {
  const paths: Record<FeatureItemProps["icon"], string> = {
    bolt: "M13 2L4 14h7l-1 8 10-13h-7l1-7z",
    users:
      "M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4M12 12a3 3 0 100-6 3 3 0 000 6zM20 19c0-1.8-1.2-3.2-2.8-3.8M17 6.3a2.5 2.5 0 010 4.4M4 19c0-1.8 1.2-3.2 2.8-3.8M7 6.3a2.5 2.5 0 000 4.4",
    chart:
      "M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6M20 15v-2"
  };

  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d={paths[icon]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-base text-white">
        <FeatureIcon icon={icon} />
      </span>
      <span>
        <span className="block text-sm font-bold text-white">{title}</span>
        <span className="mt-0.5 block text-sm leading-5 text-white/60">{description}</span>
      </span>
    </li>
  );
}
