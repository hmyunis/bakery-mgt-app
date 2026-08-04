import { tr } from "../locales";
import { PageTitle } from "../components/ui/PageTitle";

export function AttendancePage() {
    return (
        <div className="space-y-6">
            <PageTitle
                title={tr("Attendance")}
                subtitle={tr(
                    "Admin-led attendance marking (Present, Late, Absent, Overtime) and daily summaries."
                )}
            />
            <div className="text-sm text-slate-500">{tr("This page is under construction.")}</div>
        </div>
    );
}
