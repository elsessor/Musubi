"use client";

import { useEffect, useRef } from "react";
import { attachTutorialViewDemo } from "@/components/onboarding/tourViewDemo";
import type { TourViewMode } from "@/config/tutorialViews";

export function useTutorialView(select: (mode: TourViewMode) => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) return attachTutorialViewDemo(ref.current, select);
  }, [select]);
  return ref;
}
