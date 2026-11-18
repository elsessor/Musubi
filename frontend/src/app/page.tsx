import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Musubi | Plan campus events. Keep your team in sync.",
  description: "Bring events, tasks, committees, and organization updates into one shared workspace. Built for student leaders and campus organization members."
};

export default function HomePage() {
  return <LandingPage />;
}
