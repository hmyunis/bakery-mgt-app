import { tr } from "../locales";
import { PageTitle } from "../components/ui/PageTitle";

export function ShiftsPage() {
    return (
        <div className="space-y-6">
            <PageTitle
                title={tr("Shifts & Roster")}
                subtitle={tr(
                    "Create reusable shift templates and assign shifts to employees by date."
                )}
            />
            <div className="text-sm text-slate-500">{tr("This page is under construction.")}</div>
        </div>
    );
}
