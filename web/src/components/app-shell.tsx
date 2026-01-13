'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState, ComponentType } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  ChartBarIcon,
  ListBulletIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  ArchiveBoxIcon,
  TagIcon,
} from "@/components/ui/icons";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: ChartBarIcon },
  { href: "/transactions", label: "Transactions", icon: ListBulletIcon },
  { href: "/imports", label: "Import", icon: ArrowUpTrayIcon },
  { href: "/imports/pending", label: "Pending", icon: ClockIcon },
  { href: "/imports/history", label: "History", icon: ArchiveBoxIcon },
  { href: "/categories", label: "Categories", icon: TagIcon },
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

function NavigationLink({
  href,
  label,
  icon: Icon,
  onClick
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
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
      className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-slate-900 text-white"
          : "text-slate-500 hover:bg-slate-200 hover:text-slate-900"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function MobileNavigationLink({
  href,
  label,
  icon: Icon,
  onClick
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
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
      className={`flex items-center gap-3 rounded-md px-4 py-3 text-base font-medium transition-colors min-h-11 ${
        isActive
          ? "bg-slate-900 text-white"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavigationLink key={item.href} {...item} />
            ))}
            {session && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="ml-2 rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
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
                className="flex items-center gap-3 w-full text-left rounded-md px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-100 transition-colors min-h-11"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
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
