"use client";

import Link from "next/link";
import { Suspense } from "react";
import AuthHeader from "@/components/AuthHeader";

export default function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-5">
      <Link
        href="/"
        className="font-display text-2xl font-semibold tracking-tight text-foreground"
      >
        LendLoop
      </Link>
      <Suspense fallback={<div className="h-9 w-28 rounded-md bg-line/60" />}>
        <AuthHeader />
      </Suspense>
    </header>
  );
}
