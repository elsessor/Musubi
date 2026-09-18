import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: "Musubi: Your All-in-One Task Orchestration Platform for Campus Organizations",
  description: "Task Orchestration for Campus Organizations"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
