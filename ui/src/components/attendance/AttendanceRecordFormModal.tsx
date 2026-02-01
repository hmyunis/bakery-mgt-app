import { useMemo, useState } from "react";
import {
    Button,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Select,
    SelectItem,
    Textarea,
} from "@heroui/react";
import type { AttendanceRecord, AttendanceStatus } from "../../types/attendance";
import type { UpdateAttendanceRecordData } from "../../services/attendanceService";

const STATUS_OPTIONS: Array<{ key: AttendanceStatus; label: string }> = [
    { key: "present", label: "Present" },
    { key: "late", label: "Late" },
    { key: "absent", label: "Absent" },
    { key: "overtime", label: "Overtime" },
];

interface AttendanceRecordFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: AttendanceRecord | null;
    onSubmit: (payload: UpdateAttendanceRecordData) => Promise<void>;
    isLoading?: boolean;
}

function AttendanceRecordFormContent({
    record,
    onClose,
    onSubmit,
    isLoading,
}: {
    record: AttendanceRecord | null;
    onClose: () => void;
    onSubmit: (payload: UpdateAttendanceRecordData) => Promise<void>;
    isLoading: boolean;
}) {
    const [status, setStatus] = useState<AttendanceStatus>(record?.status ?? "present");
    const [lateMinutes, setLateMinutes] = useState<string>(String(record?.lateMinutes ?? 0));
    const [overtimeMinutes, setOvertimeMinutes] = useState<string>(
        String(record?.overtimeMinutes ?? 0)
    );
    const [notes, setNotes] = useState<string>(record?.notes ?? "");

    const statusKeys = useMemo(() => new Set<string>([status]), [status]);

    const lateMinutesInt = useMemo(() => {
        const trimmed = lateMinutes.trim();
        if (!trimmed) return 0;
        const n = Number(trimmed);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return undefined;
        return n;
    }, [lateMinutes]);

    const overtimeMinutesInt = useMemo(() => {
        const trimmed = overtimeMinutes.trim();
        if (!trimmed) return 0;
        const n = Number(trimmed);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return undefined;
        return n;
    }, [overtimeMinutes]);

    const canSubmit =
        !!record && !isLoading && lateMinutesInt !== undefined && overtimeMinutesInt !== undefined;

    const handleSubmit = async () => {
        if (!record) return;
        if (!canSubmit) return;

        await onSubmit({
            status,
            lateMinutes: status === "late" ? lateMinutesInt : 0,
            overtimeMinutes: status === "overtime" ? overtimeMinutesInt : 0,
            notes: notes.trim() ? notes.trim() : null,
        });
        onClose();
    };

    return (
        <>
            <ModalHeader>Edit Attendance</ModalHeader>
            <ModalBody className="space-y-4">
                {record && (
                    <div className="text-xs text-slate-500">
                        {record.employeeName} · {record.shiftName} · {record.shiftDate}
                    </div>
                )}

                <Select
                    label="Status"
                    selectedKeys={statusKeys}
                    onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as AttendanceStatus;
                        if (selected) setStatus(selected);
                    }}
                    classNames={{
                        trigger: "!w-full !text-left",
                        label: "!w-full !text-left",
                        base: "!w-full !text-left",
                        value: "!text-slate-900 dark:!text-slate-100",
                    }}
                >
                    {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} textValue={opt.label}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </Select>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                        label="Late Minutes"
                        type="number"
                        value={lateMinutes}
                        onValueChange={setLateMinutes}
                        isDisabled={status !== "late"}
                        isInvalid={status === "late" && lateMinutesInt === undefined}
                        errorMessage={
                            status === "late" && lateMinutesInt === undefined
                                ? "Enter a valid non-negative integer"
                                : undefined
                        }
                    />
                    <Input
                        label="Overtime Minutes"
                        type="number"
                        value={overtimeMinutes}
                        onValueChange={setOvertimeMinutes}
                        isDisabled={status !== "overtime"}
                        isInvalid={status === "overtime" && overtimeMinutesInt === undefined}
                        errorMessage={
                            status === "overtime" && overtimeMinutesInt === undefined
                                ? "Enter a valid non-negative integer"
                                : undefined
                        }
                    />
                </div>

                <Textarea
                    label="Notes (optional)"
                    value={notes}
                    onValueChange={setNotes}
                    minRows={3}
                />
            </ModalBody>
            <ModalFooter>
                <Button variant="flat" onPress={onClose} isDisabled={isLoading}>
                    Cancel
                </Button>
                <Button
                    color="primary"
                    onPress={handleSubmit}
                    isLoading={isLoading}
                    isDisabled={!canSubmit}
                >
                    Save
                </Button>
            </ModalFooter>
        </>
    );
}

export function AttendanceRecordFormModal({
    isOpen,
    onClose,
    record,
    onSubmit,
    isLoading = false,
}: AttendanceRecordFormModalProps) {
    const contentKey = record ? `edit-attendance-${record.id}` : "edit-attendance-none";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" backdrop="blur" scrollBehavior="inside">
            <ModalContent>
                {(close) => (
                    <AttendanceRecordFormContent
                        key={contentKey}
                        record={record}
                        onClose={close}
                        onSubmit={onSubmit}
                        isLoading={isLoading}
                    />
                )}
            </ModalContent>
        </Modal>
    );
}
