import { type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface PageTitleProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    className?: string;
}

export function PageTitle({ title, subtitle, actions, className }: PageTitleProps) {
    return (
        <div
            className={cn(
                "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
                className
            )}
        >
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{title}</h1>
                {subtitle && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
                )}
            </div>
            {actions && <div className="ml-auto mt-4 sm:mt-0">{actions}</div>}
        </div>
    );
}
