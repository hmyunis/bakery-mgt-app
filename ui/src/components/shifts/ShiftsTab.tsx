import { Tab, Tabs } from "@heroui/react";
import { CalendarDays, Clock } from "lucide-react";
import { ShiftTemplatesTab } from "./ShiftTemplatesTab";
import { ShiftAssignmentsTab } from "./ShiftAssignmentsTab";

export function ShiftsTab() {
    return (
        <div className="space-y-4">
            <Tabs
                aria-label="Shifts"
                color="primary"
                variant="bordered"
                classNames={{
                    tabList: "flex flex-wrap gap-2 sm:gap-3",
                    tab: "whitespace-nowrap",
                }}
            >
                <Tab
                    key="templates"
                    title={
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Templates</span>
                        </div>
                    }
                >
                    <ShiftTemplatesTab />
                </Tab>

                <Tab
                    key="assignments"
                    title={
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            <span>Assignments</span>
                        </div>
                    }
                >
                    <ShiftAssignmentsTab />
                </Tab>
            </Tabs>
        </div>
    );
}
