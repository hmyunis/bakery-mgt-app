import { memo } from "react";
import { Card, CardBody, Select, SelectItem } from "@heroui/react";
import type { Employee } from "../../types/employee";
import type { LeaveType } from "../../types/leave";

const LEAVE_TYPES: Array<{ key: LeaveType; label: string }> = [
    { key: "sick", label: "Sick" },
    { key: "annual", label: "Annual" },
    { key: "holiday", label: "Holiday" },
    { key: "other", label: "Other" },
];

function LeaveFilterCard({
    employees,
    employee,
    leaveType,
    onEmployeeChange,
    onLeaveTypeChange,
}: {
    employees: Employee[];
    employee: number | "";
    leaveType: LeaveType | "";
    onEmployeeChange: (employee: number | "") => void;
    onLeaveTypeChange: (leaveType: LeaveType | "") => void;
}) {
    const employeeKeys = employee ? new Set<string>([String(employee)]) : new Set<string>();
    const leaveTypeKeys = leaveType ? new Set<string>([String(leaveType)]) : new Set<string>();

    return (
        <Card className="w-full">
            <CardBody className="py-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                        label="Employee"
                        placeholder="All"
                        selectedKeys={employeeKeys}
                        onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as string | undefined;
                            onEmployeeChange(selected ? Number(selected) : "");
                        }}
                        classNames={{
                            trigger: "!w-full !text-left",
                            label: "!w-full !text-left",
                            base: "!w-full !text-left",
                            value: "!text-slate-900 dark:!text-slate-100",
                        }}
                    >
                        {employees.map((e) => (
                            <SelectItem key={String(e.id)} textValue={e.fullName}>
                                {e.fullName}
                            </SelectItem>
                        ))}
                    </Select>

                    <Select
                        label="Leave Type"
                        placeholder="All"
                        selectedKeys={leaveTypeKeys}
                        onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as LeaveType | undefined;
                            onLeaveTypeChange(selected ?? "");
                        }}
                        classNames={{
                            trigger: "!w-full !text-left",
                            label: "!w-full !text-left",
                            base: "!w-full !text-left",
                            value: "!text-slate-900 dark:!text-slate-100",
                        }}
                    >
                        {LEAVE_TYPES.map((t) => (
                            <SelectItem key={t.key} textValue={t.label}>
                                {t.label}
                            </SelectItem>
                        ))}
                    </Select>
                </div>
            </CardBody>
        </Card>
    );
}

export const MemoLeaveFilterCard = memo(LeaveFilterCard);
