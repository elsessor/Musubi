"use client";

import { create } from "zustand";

// Keep the user's choice across dashboard pages that remount their layout.
export const useDashboardUIStore = create<{
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
}));
