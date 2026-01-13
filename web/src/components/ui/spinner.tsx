import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";

type SpinnerProps = {
  size?: SpinnerSize;
  label?: string;
  className?: string;
};

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-3",
};

export function Spinner({ size = "md", label, className }: SpinnerProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-2", className)}
      role="status"
      aria-label={label ?? "Loading"}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-slate-200 border-t-slate-600",
          sizeClasses[size]
        )}
      />
      {label && (
        <span className="text-sm text-slate-500">{label}</span>
      )}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}

export default Spinner;
