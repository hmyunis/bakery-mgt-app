import { useMemo, useState } from "react";
import { Tab, Tabs } from "@heroui/react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, CalendarOff, ClipboardCheck } from "lucide-react";
import { PageTitle } from "../components/ui/PageTitle";
import { ShiftsTab } from "../components/shifts";
import { AttendanceTab } from "../components/attendance";
import { LeavesTab } from "../components/leaves";

type HrTabKey = "shifts" | "attendance" | "leaves";

export function HrPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    const tabFromUrl = searchParams.get("tab") as HrTabKey | null;
    const selectedKey: HrTabKey = useMemo(() => {
        if (tabFromUrl === "attendance" || tabFromUrl === "leaves" || tabFromUrl === "shifts")
            return tabFromUrl;
        return "attendance";
    }, [tabFromUrl]);

    const [localSelected, setLocalSelected] = useState<HrTabKey>(selectedKey);

    if (localSelected !== selectedKey) setLocalSelected(selectedKey);

    const onSelectionChange = (key: string | number) => {
        const next = String(key) as HrTabKey;
        setLocalSelected(next);
        setSearchParams({ tab: next }, { replace: true });
    };

    return (
        <div className="space-y-6">
            <PageTitle title="HR" subtitle="Manage shifts, attendance, and leave records." />

            <Tabs
                aria-label="HR"
                selectedKey={localSelected}
                onSelectionChange={onSelectionChange}
                color="primary"
                variant="underlined"
                classNames={{
                    tabList: "flex flex-wrap gap-2 sm:gap-3",
                    tab: "whitespace-nowrap",
                }}
            >
                <Tab
                    key="shifts"
                    title={
                        <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4" />
                            <span>Shifts</span>
                        </div>
                    }
                >
                    <ShiftsTab />
                </Tab>

                <Tab
                    key="attendance"
                    title={
                        <div className="flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4" />
                            <span>Attendance</span>
                        </div>
                    }
                >
                    <AttendanceTab />
                </Tab>

                <Tab
                    key="leaves"
                    title={
                        <div className="flex items-center gap-2">
                            <CalendarOff className="h-4 w-4" />
                            <span>Leaves</span>
                        </div>
                    }
                >
                    <LeavesTab />
                </Tab>
            </Tabs>
        </div>
    );
}
