import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
}

export function Card({ children, className, title, description, footer }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm',
        className
      )}
    >
      {(title || description) && (
        <div className="p-6 pb-0">
          {title && <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>}
          {description && <p className="text-slate-600 dark:text-slate-400 mt-1">{description}</p>}
        </div>
      )}
      {children && <div className="p-6">{children}</div>}
      {footer && (
        <div className="p-6 pt-0 mt-4 border-t border-slate-200 dark:border-slate-700">
          {footer}
        </div>
      )}
    </div>
  );
}
