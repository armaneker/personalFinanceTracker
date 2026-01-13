import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'action' | 'info' | 'success' | 'warning' | 'error';
}

const variantStyles = {
  default: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm',
  action: 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800 shadow-sm ring-1 ring-blue-100 dark:ring-blue-900',
  info: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
  success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
};

export function Card({ children, className, variant = 'default' }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-6',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export function CardHeader({ children, className, icon }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center gap-2 mb-4', className)}>
      {icon && <span className="text-slate-500 dark:text-slate-400">{icon}</span>}
      <div>{children}</div>
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn('text-base font-semibold text-slate-900 dark:text-white', className)}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-slate-500 dark:text-slate-400', className)}>
      {children}
    </p>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn(className)}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('mt-4 pt-4 border-t border-slate-100 dark:border-slate-700', className)}>
      {children}
    </div>
  );
}
