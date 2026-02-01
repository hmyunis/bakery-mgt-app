import { useMemo, useState } from "react";
import {
    Button,
    Checkbox,
    DatePicker,
    Divider,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Select,
    SelectItem,
} from "@heroui/react";
import { getLocalTimeZone, today } from "@internationalized/date";
import type { DateValue } from "@react-types/datepicker";
import type { Employee } from "../../types/employee";
import type { ShiftTemplate } from "../../types/shift";

export interface BulkCreateAssignmentsPayload {
    employee: number;
    shift: number;
    startDate: string;
    endDate: string;
    skipWeekends: boolean;
    skipLeaveDays: boolean;
}

export interface BulkCreateAssignmentsResult {
    createdCount: number;
    skippedExisting: number;
    skippedWeekends: number;
    skippedLeaveDays: number;
}

interface BulkShiftAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    employees: Employee[];
    shifts: ShiftTemplate[];
    onSubmit: (payload: BulkCreateAssignmentsPayload) => Promise<BulkCreateAssignmentsResult>;
    isLoading?: boolean;
}

export function BulkShiftAssignmentModal({
    isOpen,
    onClose,
    employees,
    shifts,
    onSubmit,
    isLoading = false,
}: BulkShiftAssignmentModalProps) {
    const [employeeId, setEmployeeId] = useState<number | null>(null);
    const [shiftId, setShiftId] = useState<number | null>(null);

    const [startDate, setStartDate] = useState<DateValue>(() => today(getLocalTimeZone()));
    const [endDate, setEndDate] = useState<DateValue>(() => today(getLocalTimeZone()));

    const [skipWeekends, setSkipWeekends] = useState(true);
    const [skipLeaveDays, setSkipLeaveDays] = useState(true);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [result, setResult] = useState<BulkCreateAssignmentsResult | null>(null);

    const employeeKeys = useMemo(
        () => (employeeId ? new Set<string>([String(employeeId)]) : new Set<string>()),
        [employeeId]
    );
    const shiftKeys = useMemo(
        () => (shiftId ? new Set<string>([String(shiftId)]) : new Set<string>()),
        [shiftId]
    );

    const validate = () => {
        const next: Record<string, string> = {};
        if (!employeeId) next.employee = "Employee is required";
        if (!shiftId) next.shift = "Shift is required";

        const startStr = startDate.toString();
        const endStr = endDate.toString();
        if (!startStr) next.startDate = "Start date is required";
        if (!endStr) next.endDate = "End date is required";
        if (endStr < startStr) next.endDate = "End date cannot be before start date";

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        if (!employeeId || !shiftId) return;

        const payload: BulkCreateAssignmentsPayload = {
            employee: employeeId,
            shift: shiftId,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            skipWeekends,
            skipLeaveDays,
        };

        const res = await onSubmit(payload);
        setResult(res);
    };

    const resetAndClose = () => {
        setEmployeeId(null);
        setShiftId(null);
        setStartDate(today(getLocalTimeZone()));
        setEndDate(today(getLocalTimeZone()));
        setSkipWeekends(true);
        setSkipLeaveDays(true);
        setErrors({});
        setResult(null);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={resetAndClose}
            size="lg"
            backdrop="blur"
            scrollBehavior="inside"
        >
            <ModalContent>
                {(close) => (
                    <>
                        <ModalHeader>Bulk Create Assignments</ModalHeader>
                        <ModalBody className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Select
                                    label="Employee"
                                    placeholder="Select employee"
                                    selectedKeys={employeeKeys}
                                    onSelectionChange={(keys) => {
                                        const selected = Array.from(keys)[0] as string | undefined;
                                        setEmployeeId(selected ? Number(selected) : null);
                                    }}
                                    isRequired
                                    isInvalid={!!errors.employee}
                                    errorMessage={errors.employee}
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
                                    placeholder="Select shift"
                                    selectedKeys={shiftKeys}
                                    onSelectionChange={(keys) => {
                                        const selected = Array.from(keys)[0] as string | undefined;
                                        setShiftId(selected ? Number(selected) : null);
                                    }}
                                    isRequired
                                    isInvalid={!!errors.shift}
                                    errorMessage={errors.shift}
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
                                    label="Start Date"
                                    variant="bordered"
                                    showMonthAndYearPickers
                                    value={startDate}
                                    onChange={(d) => d && setStartDate(d)}
                                    isRequired
                                    isInvalid={!!errors.startDate}
                                    errorMessage={errors.startDate}
                                />

                                <DatePicker
                                    label="End Date"
                                    variant="bordered"
                                    showMonthAndYearPickers
                                    value={endDate}
                                    onChange={(d) => d && setEndDate(d)}
                                    isRequired
                                    isInvalid={!!errors.endDate}
                                    errorMessage={errors.endDate}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Checkbox isSelected={skipWeekends} onValueChange={setSkipWeekends}>
                                    Skip weekends
                                </Checkbox>
                                <Checkbox
                                    isSelected={skipLeaveDays}
                                    onValueChange={setSkipLeaveDays}
                                >
                                    Skip leave days
                                </Checkbox>
                            </div>

                            {result && (
                                <>
                                    <Divider />
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                        <div>
                                            <div className="text-slate-500">Created</div>
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                                                {result.createdCount}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-slate-500">Existing</div>
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                                                {result.skippedExisting}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-slate-500">Weekends</div>
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                                                {result.skippedWeekends}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-slate-500">Leave days</div>
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                                                {result.skippedLeaveDays}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                variant="flat"
                                onPress={() => {
                                    setResult(null);
                                    setErrors({});
                                    close();
                                }}
                            >
                                Close
                            </Button>
                            <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
                                Generate
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
