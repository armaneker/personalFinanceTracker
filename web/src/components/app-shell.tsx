'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/imports", label: "Imports" },
  { href: "/imports/pending", label: "Pending" },
  { href: "/categories", label: "Categories" },
];

function NavigationLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive =
    href === "/"
      ? pathname === "/" || pathname.startsWith("/dashboard")
      : href === "/imports"
        ? pathname === "/imports"
        : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-slate-900 text-white"
          : "text-slate-500 hover:bg-slate-200 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Don't show app shell on login page
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Show loading state while checking auth
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/" className="text-xl font-semibold text-slate-900">
              Finance Tracker
            </Link>
            <p className="text-sm text-slate-500">Monthly credit card insights</p>
          </div>
          <nav className="flex items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <NavigationLink key={item.href} {...item} />
            ))}
            {session && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="ml-4 rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
              >
                Sign out
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
