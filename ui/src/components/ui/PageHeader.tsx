import { type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    iconColor?: "cyan" | "emerald" | "amber" | "violet" | "rose" | "primary";
    actions?: ReactNode;
    badge?: ReactNode;
    className?: string;
}

const iconColorClasses: Record<string, string> = {
    cyan: "from-cyan-500 to-cyan-400 shadow-cyan-500/30",
    emerald: "from-emerald-500 to-emerald-400 shadow-emerald-500/30",
    amber: "from-amber-500 to-amber-400 shadow-amber-500/30",
    violet: "from-violet-500 to-violet-400 shadow-violet-500/30",
    rose: "from-rose-500 to-rose-400 shadow-rose-500/30",
    primary: "from-[var(--accent)] to-cyan-400 shadow-[var(--accent)]/30",
};

export function PageHeader({
    title,
    subtitle,
    icon,
    iconColor = "primary",
    actions,
    badge,
    className,
}: PageHeaderProps) {
    return (
        <div className={cn("mb-6 lg:mb-8", className)}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Left side: Icon + Title/Subtitle */}
                <div className="flex items-start sm:items-center gap-4">
                    {icon && (
                        <div
                            className={cn(
                                "shrink-0 size-12 lg:size-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                                iconColorClasses[iconColor]
                            )}
                        >
                            <div className="text-white">{icon}</div>
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                                <span className="bg-gradient-to-r from-[var(--fg)] via-[var(--fg)] to-[var(--muted)] bg-clip-text text-transparent">
                                    {title}
                                </span>
                            </h1>
                            {badge && <div>{badge}</div>}
                        </div>

                        {subtitle && (
                            <p className="mt-1 text-sm sm:text-base text-[var(--muted)] max-w-2xl">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right side: Actions */}
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </div>

            {/* Decorative gradient line */}
            <div className="mt-4 lg:mt-6 h-px bg-gradient-to-r from-[var(--accent)]/50 via-[var(--border)] to-transparent" />
        </div>
    );
}
