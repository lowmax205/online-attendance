"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";

export function ConditionalFooter() {
  const pathname = usePathname();

  // Don't show footer on homepage (it's included in the page itself)
  if (pathname === "/") {
    return null;
  }

  return <Footer />;
}
