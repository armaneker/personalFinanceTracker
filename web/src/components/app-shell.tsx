'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState, ComponentType, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  ChartBarIcon,
  ListBulletIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  ArchiveBoxIcon,
  TagIcon,
  UserIcon,
  SunIcon,
  MoonIcon,
  ComputerIcon,
} from "@/components/ui/icons";
import { useTheme } from "@/components/providers/theme-provider";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "View",
    items: [
      { href: "/", label: "Dashboard", icon: ChartBarIcon },
      { href: "/transactions", label: "Transactions", icon: ListBulletIcon },
    ],
  },
  {
    label: "Import",
    items: [
      { href: "/imports", label: "Upload", icon: ArrowUpTrayIcon },
      { href: "/imports/pending", label: "Pending", icon: ClockIcon },
      { href: "/imports/history", label: "History", icon: ArchiveBoxIcon },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/categories", label: "Categories", icon: TagIcon },
      { href: "/settings", label: "Settings", icon: UserIcon },
    ],
  },
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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className || "h-4 w-4"}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m19.5 8.25-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

function SignOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  );
}

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const ThemeIcon = resolvedTheme === "dark" ? MoonIcon : SunIcon;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center h-9 w-9 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Toggle theme"
      >
        <ThemeIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 shadow-lg">
          <button
            onClick={() => { setTheme("light"); setIsOpen(false); }}
            className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${
              theme === "light"
                ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-medium"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <SunIcon className="h-4 w-4" />
            Light
          </button>
          <button
            onClick={() => { setTheme("dark"); setIsOpen(false); }}
            className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${
              theme === "dark"
                ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-medium"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <MoonIcon className="h-4 w-4" />
            Dark
          </button>
          <button
            onClick={() => { setTheme("system"); setIsOpen(false); }}
            className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${
              theme === "system"
                ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-medium"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <ComputerIcon className="h-4 w-4" />
            System
          </button>
        </div>
      )}
    </div>
  );
}

function MobileThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
      <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Theme
      </p>
      <div className="flex gap-2 px-4">
        <button
          onClick={() => setTheme("light")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
            theme === "light"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <SunIcon className="h-4 w-4" />
          Light
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
            theme === "dark"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <MoonIcon className="h-4 w-4" />
          Dark
        </button>
        <button
          onClick={() => setTheme("system")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
            theme === "system"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <ComputerIcon className="h-4 w-4" />
          Auto
        </button>
      </div>
    </div>
  );
}

function NavigationDropdown({ group }: { group: NavGroup }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevPathnameRef = useRef<string | null>(null);
  const pathname = usePathname();

  const isGroupActive = group.items.some(item => {
    if (item.href === "/") {
      return pathname === "/" || pathname.startsWith("/dashboard");
    }
    if (item.href === "/imports") {
      return pathname === "/imports";
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname) {
      queueMicrotask(() => setIsOpen(false));
    }
    prevPathnameRef.current = pathname;
  }, [pathname]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isGroupActive
            ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
        }`}
      >
        {group.label}
        <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 shadow-lg">
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname.startsWith("/dashboard")
                : item.href === "/imports"
                  ? pathname === "/imports"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
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
      className={`flex items-center gap-3 rounded-md px-4 py-3 text-base font-medium transition-colors min-h-[44px] ${
        isActive
          ? "bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900"
          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname) {
      queueMicrotask(() => setMobileMenuOpen(false));
    }
    prevPathnameRef.current = pathname;
  }, [pathname]);

  if (pathname === "/login" || pathname === "/signup") {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div>
            <Link href="/" className="text-xl font-semibold text-slate-900 dark:text-white">
              Finance Tracker
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Monthly credit card insights</p>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_GROUPS.map((group) => (
              <NavigationDropdown key={group.label} group={group} />
            ))}
            <ThemeToggle />
            {session && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="ml-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                <SignOutIcon className="h-4 w-4" />
                Sign out
              </button>
            )}
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center h-11 w-11 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>

        {mobileMenuOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 top-[57px] bg-black/20 dark:bg-black/40 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />

            <nav className="md:hidden fixed right-0 top-[57px] bottom-0 w-72 max-w-[80vw] bg-white dark:bg-slate-900 z-50 shadow-xl overflow-y-auto animate-slide-in-right">
              <div className="p-4 space-y-6">
                {NAV_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {group.label}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <MobileNavigationLink
                          key={item.href}
                          {...item}
                          onClick={() => setMobileMenuOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                <MobileThemeSelector />

                {session && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        signOut({ callbackUrl: "/login" });
                      }}
                      className="flex items-center gap-3 w-full text-left rounded-md px-4 py-3 text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
                    >
                      <SignOutIcon className="h-5 w-5" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
