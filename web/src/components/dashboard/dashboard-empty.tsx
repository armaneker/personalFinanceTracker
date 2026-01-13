import Link from "next/link";
import { WalletIcon } from "@/components/ui/empty-state";

type OnboardingStep = {
  label: string;
  status: "completed" | "current" | "upcoming";
};

const onboardingSteps: OnboardingStep[] = [
  { label: "Create account", status: "completed" },
  { label: "Import your first statement", status: "current" },
  { label: "Review transactions", status: "upcoming" },
  { label: "View spending insights", status: "upcoming" },
];

function StepIcon({ status }: { status: OnboardingStep["status"] }) {
  if (status === "completed") {
    // Checkmark
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "current") {
    // Arrow
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </span>
    );
  }
  // Upcoming - empty circle
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500">
      <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
    </span>
  );
}

/**
 * Dashboard empty state with onboarding checklist.
 * Shows welcome message and guides users to import their first statement.
 */
export default function DashboardEmpty() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-sm text-center">
      {/* Icon */}
      <div className="mb-4 text-slate-400 dark:text-slate-500">
        <WalletIcon />
      </div>

      {/* Heading */}
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
        Welcome! Let&apos;s get started
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
        Import your first credit card statement to unlock spending insights,
        transaction tracking, and personalized analytics.
      </p>

      {/* Onboarding Checklist */}
      <div className="mt-6 w-full max-w-sm">
        <div className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 text-left">
            Getting Started
          </h3>
          <ul className="space-y-3">
            {onboardingSteps.map((step) => (
              <li
                key={step.label}
                className={`flex items-center gap-3 text-sm ${
                  step.status === "completed"
                    ? "text-slate-500 dark:text-slate-400"
                    : step.status === "current"
                    ? "text-blue-700 dark:text-blue-400 font-medium"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                <StepIcon status={step.status} />
                <span className={step.status === "completed" ? "line-through" : ""}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Primary CTA */}
      <Link
        href="/imports"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-slate-900 shadow-sm transition hover:bg-slate-800 dark:hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 16.5V9.75m0 0l3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
          />
        </svg>
        Import Statement
      </Link>
    </div>
  );
}
