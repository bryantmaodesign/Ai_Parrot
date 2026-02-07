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
            <svg className="h-6 w-6" fill="currentColor" stroke="currentColor" strokeWidth="0.5" viewBox="0 0 24 24" aria-hidden>
              <path fillRule="evenodd" clipRule="evenodd" d="M10.1018 1.0227C9.72064 1.05694 9.00766 1.21597 8.60798 1.3559C7.0862 1.88866 5.76081 2.98557 4.92543 4.40363C4.68985 4.80349 4.4007 5.47954 4.25655 5.96773C3.99305 6.85982 4.00303 6.50967 4.00056 14.9456C3.99834 22.5908 3.99871 22.6268 4.08334 22.7645C4.13012 22.8406 4.21689 22.9252 4.27617 22.9523C4.41009 23.0137 4.652 23.0162 4.76128 22.9574C4.89797 22.8839 7.26921 20.4869 7.72959 19.9569C8.0973 19.5336 8.18088 19.4591 8.31292 19.4367C9.04417 19.3124 10.2386 18.8329 10.9496 18.3781C11.8521 17.8008 12.6102 17.0679 13.1747 16.2272C13.5949 15.6013 14.0132 14.5645 14.1848 13.7235C14.3316 13.0045 14.3564 12.5472 14.3564 10.5658V8.6247H16.3424C18.0976 8.6247 18.3347 8.63242 18.3831 8.69102C18.5981 8.95166 19.199 9.02544 19.5681 8.83652C19.9316 8.65042 20.2035 8.25634 20.3318 7.72957C20.3672 7.5842 20.4074 7.19939 20.4211 6.87441C20.4595 5.96427 20.2992 5.18791 19.9102 4.40122C18.995 2.55029 17.0136 1.31526 14.5153 1.03856C14.1453 0.997575 10.5264 0.984589 10.1018 1.0227ZM10.0389 2.28076C8.53529 2.49194 7.12841 3.38787 6.28415 4.6719C5.58551 5.73441 5.30512 6.8 5.3029 8.40146L5.30223 8.87383L5.45942 8.9012C7.91458 9.32842 9.65978 10.3603 10.3893 11.816C10.6962 12.4285 10.8245 13.3948 10.7114 14.2423C10.6442 14.7467 10.4202 15.6256 10.2353 16.1106C10.0816 16.5139 9.72534 17.2523 9.54853 17.534C9.42043 17.7381 9.44369 17.7313 9.95358 17.414C11.6608 16.3519 12.6895 14.7439 12.9524 12.727C13.005 12.3237 13.0151 11.4386 13.0151 7.23122V2.21617L11.7261 2.22051C10.9072 2.22329 10.2919 2.24526 10.0389 2.28076ZM14.3564 4.78801V7.3177H16.7399H19.1234L19.1474 7.05419C19.1606 6.90928 19.1538 6.58771 19.1323 6.33964C18.9583 4.3341 17.324 2.76878 14.9555 2.33915C14.7104 2.29471 14.4754 2.25833 14.4332 2.25833C14.3597 2.25833 14.3564 2.36449 14.3564 4.78801ZM10.1993 3.9837C9.62566 4.16993 9.31144 4.72005 9.46846 5.26334C9.71087 6.10197 10.8385 6.2597 11.3248 5.52301C11.7568 4.86854 11.3226 4.03783 10.5105 3.96515C10.401 3.95537 10.261 3.96371 10.1993 3.9837ZM5.30223 15.1663C5.30223 19.9462 5.30579 20.187 5.37558 20.1282C7.13839 18.6431 8.13515 17.4841 8.75561 16.198C9.54128 14.5695 9.64758 13.1493 9.057 12.1715C8.49572 11.2421 7.37489 10.5752 5.81614 10.2431C5.55637 10.1878 5.33446 10.1425 5.32302 10.1425C5.31157 10.1425 5.30223 12.4032 5.30223 15.1663Z" />
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
