import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import type { AttendanceRecord } from "../../types/attendance";

interface DeleteAttendanceRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: AttendanceRecord | null;
    onConfirm: () => Promise<void>;
    isLoading?: boolean;
}

export function DeleteAttendanceRecordModal({
    isOpen,
    onClose,
    record,
    onConfirm,
    isLoading = false,
}: DeleteAttendanceRecordModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" backdrop="blur">
            <ModalContent>
                {(close) => (
                    <>
                        <ModalHeader>Delete Attendance Record</ModalHeader>
                        <ModalBody className="space-y-2">
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                This will permanently delete the attendance record.
                            </p>
                            {record && (
                                <div className="text-xs text-slate-500">
                                    {record.employeeName} · {record.shiftName} · {record.shiftDate}
                                </div>
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="flat" onPress={close} isDisabled={isLoading}>
                                Cancel
                            </Button>
                            <Button
                                color="danger"
                                onPress={onConfirm}
                                isLoading={isLoading}
                                isDisabled={!record}
                            >
                                Delete
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
