import { memo, useMemo } from "react";
import { Card, CardBody, DatePicker, Select, SelectItem } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@react-types/datepicker";
import type { Employee } from "../../types/employee";
import type { ShiftTemplate } from "../../types/shift";

function ShiftAssignmentFilterCard({
    employees,
    shifts,
    employee,
    shift,
    shiftDate,
    onEmployeeChange,
    onShiftChange,
    onShiftDateChange,
}: {
    employees: Employee[];
    shifts: ShiftTemplate[];
    employee: number | "";
    shift: number | "";
    shiftDate: string;
    onEmployeeChange: (employee: number | "") => void;
    onShiftChange: (shift: number | "") => void;
    onShiftDateChange: (dateStr: string) => void;
}) {
    const employeeKeys = employee ? new Set<string>([String(employee)]) : new Set<string>();
    const shiftKeys = shift ? new Set<string>([String(shift)]) : new Set<string>();

    const dateValue = useMemo<DateValue | null>(() => {
        if (!shiftDate) return null;
        try {
            return parseDate(shiftDate);
        } catch {
            return null;
        }
    }, [shiftDate]);

    return (
        <Card className="w-full">
            <CardBody className="py-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        label="Shift"
                        placeholder="All"
                        selectedKeys={shiftKeys}
                        onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as string | undefined;
                            onShiftChange(selected ? Number(selected) : "");
                        }}
                        classNames={{
                            trigger: "!w-full !text-left",
                            label: "!w-full !text-left",
                            base: "!w-full !text-left",
                            value: "!text-slate-900 dark:!text-slate-100",
                        }}
                    >
                        {shifts.map((s) => (
                            <SelectItem key={String(s.id)} textValue={s.name}>
                                {s.name}
                            </SelectItem>
                        ))}
                    </Select>

                    <DatePicker
                        label="Shift Date"
                        variant="bordered"
                        showMonthAndYearPickers
                        value={dateValue}
                        onChange={(d) => {
                            if (!d) {
                                onShiftDateChange("");
                                return;
                            }
                            onShiftDateChange(d.toString());
                        }}
                        hideTimeZone
                        granularity="day"
                        defaultValue={parseDate("2026-01-01")}
                        placeholderValue={parseDate("2026-01-01")}
                        classNames={{
                            base: "!w-full",
                        }}
                    />
                </div>
            </CardBody>
        </Card>
    );
}

export const MemoShiftAssignmentFilterCard = memo(ShiftAssignmentFilterCard);
