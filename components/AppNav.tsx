"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const links = [
  { href: "/app", label: "Catalogue" },
  { href: "/app/tools/new", label: "Publier" },
  { href: "/app/my-tools", label: "Mes annonces" },
  { href: "/app/my-requests", label: "Mes demandes" },
  { href: "/app/received", label: "Demandes reçues" },
];

export default function AppNav() {
  const pathname = usePathname();
  const isAdmin = useQuery(api.admin.meIsAdmin);

  return (
    <nav className="flex flex-wrap gap-2 border-b border-line px-6 pb-3">
      {links.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== "/app" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active
                ? "bg-accent text-white"
                : "text-accent-ink hover:bg-surface"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      {isAdmin ? (
        <Link
          href="/app/admin"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            pathname.startsWith("/app/admin")
              ? "bg-accent text-white"
              : "text-accent-ink hover:bg-surface"
          }`}
        >
          Admin
        </Link>
      ) : null}
    </nav>
  );
}
