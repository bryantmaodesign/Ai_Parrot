"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/contexts/SettingsContext";

export function Nav() {
  const pathname = usePathname();
  const { isSheetOpen } = useSettings();
  const isHome = pathname === "/";
  const isLibrary = pathname === "/library" || pathname.startsWith("/library");

  if (isSheetOpen) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#eee] safe-area-pb"
      style={{ boxShadow: "0 -1px 0 rgba(0,0,0,0.06)" }}
      aria-label="Main navigation"
    >
      <ul className="flex items-center justify-around py-3 px-4 max-w-lg mx-auto">
        <li>
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 py-2 px-5 rounded-full transition-colors ${
              isHome ? "text-[#fe3c72]" : "text-[#424242] hover:text-[#1a1a1a]"
            }`}
            aria-label="Home"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 512 512" aria-hidden>
              <path d="M196.5,63.5C94.4,63.5,12.5,145.4,12.5,247.5v264.5H100.5v-68.7c55.3-14.3,96-64.8,96-125.3c0-71.2-57.8-129-129-129V100c153.4,0,278,124.6,278,278h73.5v-73.5C419,178.4,319.6,79,196.5,79L196.5,63.5z M278,378h73.5v73.5h-73.5V378z M196.5,210c-13.5,0-24.5,11-24.5,24.5S183,259,196.5,259S221,248,221,234.5S210,210,196.5,210z" />
            </svg>
            <span className="text-xs font-medium">Home</span>
          </Link>
        </li>
        <li>
          <Link
            href="/library"
            className={`flex flex-col items-center gap-1 py-2 px-5 rounded-full transition-colors ${
              isLibrary ? "text-[#fe3c72]" : "text-[#424242] hover:text-[#1a1a1a]"
            }`}
            aria-label="Library"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V8h2v4h4V8h2v3z" />
            </svg>
            <span className="text-xs font-medium">Library</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
