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
} from "@heroui/react";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import type { DateValue } from "@react-types/datepicker";
import type { Employee } from "../../types/employee";
import type { ShiftTemplate } from "../../types/shift";
import type { ShiftAssignment } from "../../types/shiftAssignment";
import type {
    CreateShiftAssignmentData,
    UpdateShiftAssignmentData,
} from "../../services/shiftAssignmentService";

interface ShiftAssignmentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateShiftAssignmentData | UpdateShiftAssignmentData) => Promise<void>;
    assignment?: ShiftAssignment | null;
    employees: Employee[];
    shifts: ShiftTemplate[];
    isLoading?: boolean;
}

function ShiftAssignmentFormContent({
    assignment,
    employees,
    shifts,
    onClose,
    onSubmit,
    isLoading,
}: {
    assignment?: ShiftAssignment | null;
    employees: Employee[];
    shifts: ShiftTemplate[];
    onClose: () => void;
    onSubmit: (data: CreateShiftAssignmentData | UpdateShiftAssignmentData) => Promise<void>;
    isLoading: boolean;
}) {
    const isEdit = !!assignment;

    const [employeeId, setEmployeeId] = useState<number | null>(assignment?.employee ?? null);
    const [shiftId, setShiftId] = useState<number | null>(assignment?.shift ?? null);
    const [shiftDate, setShiftDate] = useState<DateValue>(() => {
        if (assignment?.shiftDate) return parseDate(assignment.shiftDate);
        return today(getLocalTimeZone());
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

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
        const dateStr = shiftDate.toString();
        if (!dateStr) next.shiftDate = "Date is required";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        if (!employeeId || !shiftId) return;

        const payload = {
            employee: employeeId,
            shift: shiftId,
            shiftDate: shiftDate.toString(),
        };

        await onSubmit(payload as CreateShiftAssignmentData | UpdateShiftAssignmentData);
        onClose();
    };

    return (
        <>
            <ModalHeader>
                {isEdit ? "Edit Shift Assignment" : "Create Shift Assignment"}
            </ModalHeader>
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
                        label="Shift"
                        placeholder="Select shift"
                        selectedKeys={shiftKeys}
                        onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as string | undefined;
                            setShiftId(selected ? Number(selected) : null);
                            if (errors.shift) {
                                setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.shift;
                                    return next;
                                });
                            }
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
                        label="Shift Date"
                        variant="bordered"
                        showMonthAndYearPickers
                        value={shiftDate}
                        onChange={(d) => {
                            if (d) setShiftDate(d);
                        }}
                        isRequired
                        isInvalid={!!errors.shiftDate}
                        errorMessage={errors.shiftDate}
                    />
                </div>
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

export function ShiftAssignmentFormModal({
    isOpen,
    onClose,
    onSubmit,
    assignment,
    employees,
    shifts,
    isLoading = false,
}: ShiftAssignmentFormModalProps) {
    const formKey = assignment ? `edit-${assignment.id}` : "create-new";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" backdrop="blur" scrollBehavior="inside">
            <ModalContent>
                {(onCloseModal) => (
                    <ShiftAssignmentFormContent
                        key={formKey}
                        assignment={assignment}
                        employees={employees}
                        shifts={shifts}
                        onClose={onCloseModal}
                        onSubmit={onSubmit}
                        isLoading={isLoading}
                    />
                )}
            </ModalContent>
        </Modal>
    );
}
