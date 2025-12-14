export function DashboardPage() {
    // Temporary placeholder until analytics widgets + shortcuts are implemented.
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-[var(--fg)]">Dashboard</h1>
                <p className="text-[var(--muted)]">Coming soon.</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[var(--panel)]/80 backdrop-blur-xl p-6">
                <div className="max-w-prose space-y-2">
                    <p className="text-base font-medium text-[var(--fg)]">Admin dashboard</p>
                    <p className="text-sm text-[var(--muted)]">
                        We’re working on analytics, shortcuts, and daily summaries here.
                    </p>
                </div>
            </div>
        </div>
    );
}
