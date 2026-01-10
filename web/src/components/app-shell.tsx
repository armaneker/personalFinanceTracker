'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/imports", label: "Imports" },
  { href: "/imports/pending", label: "Pending" },
  { href: "/categories", label: "Categories" },
];

function HamburgerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function NavigationLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
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
      onClick={onClick}
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

function MobileNavigationLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
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
      onClick={onClick}
      className={`block rounded-md px-4 py-3 text-base font-medium transition-colors min-h-11 ${
        isActive
          ? "bg-slate-900 text-white"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div>
            <Link href="/" className="text-xl font-semibold text-slate-900">
              Finance Tracker
            </Link>
            <p className="text-sm text-slate-500 hidden sm:block">Monthly credit card insights</p>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-2">
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

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center h-11 w-11 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>

        {/* Mobile navigation menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <MobileNavigationLink
                key={item.href}
                {...item}
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}
            {session && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
                className="block w-full text-left rounded-md px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-100 transition-colors min-h-11"
              >
                Sign out
              </button>
            )}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
