"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

export default function AuthHeader() {
  return (
    <div className="flex items-center gap-3">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink"
          >
            Se connecter
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Link
          href="/app"
          className="text-sm font-medium text-accent-ink underline-offset-4 hover:underline"
        >
          Mon espace
        </Link>
        <UserButton />
      </Show>
    </div>
  );
}
