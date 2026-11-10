"use client";

import { createContext, useContext } from "react";

// Teaching examples are temporary presentation, never organization records.
export const TutorialPreviewContext = createContext(false);
export function useTutorialPlaceholders() {
  return useContext(TutorialPreviewContext);
}
