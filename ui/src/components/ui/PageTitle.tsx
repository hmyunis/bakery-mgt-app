import { type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { useTranslation } from "../../locales";

interface PageTitleProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    className?: string;
}

export function PageTitle({ title, subtitle, actions, className }: PageTitleProps) {
    const { t } = useTranslation();
    return (
        <div
            className={cn(
                "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
                className
            )}
        >
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    {t(title)}
                </h1>
                {subtitle && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t(subtitle)}</p>
                )}
            </div>
            {actions && <div className="ml-auto mt-4 sm:mt-0">{actions}</div>}
        </div>
    );
}
