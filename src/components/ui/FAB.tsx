"use client";

import Link from "next/link";

export function FAB() {
  return (
    <Link
      href="/chat"
      className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-violet shadow-lg shadow-violet/25 transition-transform hover:scale-105 active:scale-95 md:hidden"
    >
      <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth={2.5}
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </Link>
  );
}
