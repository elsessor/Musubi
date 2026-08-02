import { FeatureItem } from "@/components/auth/FeatureItem";

const features = [
  {
    icon: "bolt",
    title: "AI Goal Atomizer",
    description: "Turn organizational goals into structured sub-tasks instantly."
  },
  {
    icon: "users",
    title: "Smart Delegation",
    description: "Assign work based on member workload and skills."
  },
  {
    icon: "chart",
    title: "Real-Time Analytics",
    description: "Monitor completion rates and organization performance."
  }
] as const;

function LogoBolt() {
  return (
    <svg aria-hidden="true" className="size-6" fill="none" viewBox="0 0 24 24">
      <path
        d="M13 2L4 14h7l-1 8 10-13h-7l1-7z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function MarketingPanel() {
  return (
    <aside className="relative flex min-h-[560px] overflow-hidden bg-brand px-8 py-8 text-white sm:px-12 lg:min-h-screen lg:px-14 xl:px-16">
      <div className="absolute -right-20 -top-20 size-56 rounded-full bg-white/10 sm:size-72 lg:size-80" />
      <div className="absolute -bottom-28 -left-20 size-64 rounded-full bg-white/10 sm:size-80" />
      <div className="absolute right-10 top-[54%] size-36 rounded-full bg-accent/10 sm:size-44 xl:right-24" />

      <div className="relative z-10 flex w-full flex-col">
        <div className="flex items-center gap-4">
          <div className="flex size-11 items-center justify-center rounded-full bg-accent text-xl shadow-soft">
            <LogoBolt />
          </div>
          <div>
            <p className="text-base font-bold leading-5">AI-Powered Workflow Management</p>
            <p className="mt-1 text-sm font-medium text-white/60">
              Task Orchestration for Campus Orgs
            </p>
          </div>
        </div>

        <div className="my-auto max-w-3xl py-16 lg:max-w-[780px]">
          <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-[34px] xl:text-[38px]">
            AI-Powered Workflow Management and Task Orchestration System for Campus Organizations
          </h1>
          <p className="mt-6 max-w-lg text-base font-medium leading-7 text-white/70">
            Break high-level goals into delegatable sub-tasks, intelligently assign work based on
            member skills and workload, and monitor project progress in real time.
          </p>

          <ul className="mt-9 space-y-5">
            {features.map((feature) => (
              <FeatureItem key={feature.title} {...feature} />
            ))}
          </ul>
        </div>

        <p className="text-sm font-semibold text-white/20">
          (c) 2026 AI-Powered Workflow Management System - Campus Edition
        </p>
      </div>
    </aside>
  );
}
