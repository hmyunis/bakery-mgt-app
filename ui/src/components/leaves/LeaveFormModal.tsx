import { useMemo, useState } from "react";
import {
    Button,
    DatePicker,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Select,
    SelectItem,
    Textarea,
} from "@heroui/react";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import type { DateValue } from "@react-types/datepicker";
import type { Employee } from "../../types/employee";
import type { LeaveRecord, LeaveType } from "../../types/leave";
import type { CreateLeaveRecordData, UpdateLeaveRecordData } from "../../services/leaveService";

const LEAVE_TYPES: Array<{ key: LeaveType; label: string }> = [
    { key: "sick", label: "Sick" },
    { key: "annual", label: "Annual" },
    { key: "holiday", label: "Holiday" },
    { key: "other", label: "Other" },
];

interface LeaveFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateLeaveRecordData | UpdateLeaveRecordData) => Promise<void>;
    leave?: LeaveRecord | null;
    employees: Employee[];
    isLoading?: boolean;
}

function LeaveFormContent({
    leave,
    employees,
    onClose,
    onSubmit,
    isLoading,
}: {
    leave?: LeaveRecord | null;
    employees: Employee[];
    onClose: () => void;
    onSubmit: (data: CreateLeaveRecordData | UpdateLeaveRecordData) => Promise<void>;
    isLoading: boolean;
}) {
    const isEdit = !!leave;

    const [employeeId, setEmployeeId] = useState<number | null>(leave?.employee ?? null);
    const [leaveType, setLeaveType] = useState<LeaveType>(leave?.leaveType ?? "annual");
    const [startDate, setStartDate] = useState<DateValue>(() => {
        if (leave?.startDate) return parseDate(leave.startDate);
        return today(getLocalTimeZone());
    });
    const [endDate, setEndDate] = useState<DateValue>(() => {
        if (leave?.endDate) return parseDate(leave.endDate);
        return today(getLocalTimeZone());
    });
    const [notes, setNotes] = useState<string>(leave?.notes ?? "");

    const [errors, setErrors] = useState<Record<string, string>>({});

    const employeeKeys = useMemo(
        () => (employeeId ? new Set<string>([String(employeeId)]) : new Set<string>()),
        [employeeId]
    );
    const leaveTypeKeys = useMemo(() => new Set<string>([leaveType]), [leaveType]);

    const validate = () => {
        const next: Record<string, string> = {};
        if (!employeeId) next.employee = "Employee is required";
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
        if (!employeeId) return;

        const payload = {
            employee: employeeId,
            leaveType,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            notes: notes || undefined,
        };

        await onSubmit(payload as CreateLeaveRecordData | UpdateLeaveRecordData);
        onClose();
    };

    return (
        <>
            <ModalHeader>{isEdit ? "Edit Leave" : "Create Leave"}</ModalHeader>
            <ModalBody className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                        label="Employee"
                        placeholder="Select employee"
                        selectedKeys={employeeKeys}
                        onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as string | undefined;
                            setEmployeeId(selected ? Number(selected) : null);
                            if (errors.employee) {
                                setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.employee;
                                    return next;
                                });
                            }
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
                        label="Leave Type"
                        selectedKeys={leaveTypeKeys}
                        onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as LeaveType | undefined;
                            if (selected) setLeaveType(selected);
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

                    <DatePicker
                        label="Start Date"
                        variant="bordered"
                        showMonthAndYearPickers
                        value={startDate}
                        onChange={(d) => {
                            if (d) setStartDate(d);
                        }}
                        isRequired
                        isInvalid={!!errors.startDate}
                        errorMessage={errors.startDate}
                    />

                    <DatePicker
                        label="End Date"
                        variant="bordered"
                        showMonthAndYearPickers
                        value={endDate}
                        onChange={(d) => {
                            if (d) setEndDate(d);
                        }}
                        isRequired
                        isInvalid={!!errors.endDate}
                        errorMessage={errors.endDate}
                    />
                </div>

                <Textarea
                    label="Notes (optional)"
                    value={notes}
                    onValueChange={setNotes}
                    classNames={{
                        input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                    }}
                />
            </ModalBody>
            <ModalFooter>
                <Button variant="flat" onPress={onClose} isDisabled={isLoading}>
                    Cancel
                </Button>
                <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
                    {isEdit ? "Save Changes" : "Create"}
                </Button>
            </ModalFooter>
        </>
    );
}

export function LeaveFormModal({
    isOpen,
    onClose,
    onSubmit,
    leave,
    employees,
    isLoading = false,
}: LeaveFormModalProps) {
    const formKey = leave ? `edit-${leave.id}` : "create-new";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" backdrop="blur" scrollBehavior="inside">
            <ModalContent>
                {(onCloseModal) => (
                    <LeaveFormContent
                        key={formKey}
                        leave={leave}
                        employees={employees}
                        onClose={onCloseModal}
                        onSubmit={onSubmit}
                        isLoading={isLoading}
                    />
                )}
            </ModalContent>
        </Modal>
    );
}
