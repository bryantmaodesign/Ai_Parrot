import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white text-[#1a1a1a]">
      <h1 className="text-xl font-bold mb-2">You’re offline</h1>
      <p className="text-[#424242] text-center mb-6">
        Check your connection and try again. Some features need the internet.
      </p>
      <Link
        href="/"
        className="min-h-[3rem] inline-flex items-center justify-center px-5 py-3 rounded-full bg-[#fe3c72] text-white font-semibold hover:bg-[#e63568] focus:outline-none focus:ring-2 focus:ring-[#fe3c72] focus:ring-offset-2 shadow-[0_2px_12px_rgba(254,60,114,0.4)]"
      >
        Retry
      </Link>
    </div>
  );
}
