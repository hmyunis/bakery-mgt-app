import { useMemo, useState } from "react";
import {
    Button,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Switch,
    TimeInput,
} from "@heroui/react";
import type { TimeValue } from "@react-types/datepicker";
import { parseTime } from "@internationalized/date";
import type { ShiftTemplate } from "../../types/shift";
import type { CreateShiftTemplateData, UpdateShiftTemplateData } from "../../services/shiftService";

interface ShiftTemplateFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateShiftTemplateData | UpdateShiftTemplateData) => Promise<void>;
    shift?: ShiftTemplate | null;
    isLoading?: boolean;
}

function ShiftTemplateFormContent({
    shift,
    onSubmit,
    onClose,
    isLoading,
}: {
    shift?: ShiftTemplate | null;
    onSubmit: (data: CreateShiftTemplateData | UpdateShiftTemplateData) => Promise<void>;
    onClose: () => void;
    isLoading: boolean;
}) {
    const isEdit = !!shift;

    const [formData, setFormData] = useState({
        name: shift?.name || "",
        startTime: shift?.startTime || "",
        endTime: shift?.endTime || "",
        isActive: shift?.isActive ?? true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const validateForm = () => {
        const nextErrors: Record<string, string> = {};
        if (!formData.name.trim()) nextErrors.name = "Name is required";
        if (!formData.startTime) nextErrors.startTime = "Start time is required";
        if (!formData.endTime) nextErrors.endTime = "End time is required";
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        const payload = {
            name: formData.name.trim(),
            startTime: formData.startTime,
            endTime: formData.endTime,
            isActive: formData.isActive,
        };

        await onSubmit(payload as CreateShiftTemplateData | UpdateShiftTemplateData);
        onClose();
    };

    const startTimeValue = useMemo<TimeValue | null>(() => {
        if (!formData.startTime) return null;
        try {
            const normalized =
                formData.startTime.length === 5 ? `${formData.startTime}:00` : formData.startTime;
            return parseTime(normalized);
        } catch {
            return null;
        }
    }, [formData.startTime]);

    const endTimeValue = useMemo<TimeValue | null>(() => {
        if (!formData.endTime) return null;
        try {
            const normalized =
                formData.endTime.length === 5 ? `${formData.endTime}:00` : formData.endTime;
            return parseTime(normalized);
        } catch {
            return null;
        }
    }, [formData.endTime]);

    return (
        <>
            <ModalHeader>{isEdit ? "Edit Shift Template" : "Create Shift Template"}</ModalHeader>
            <ModalBody className="space-y-4">
                <Input
                    label="Name"
                    value={formData.name}
                    onValueChange={(v) => handleInputChange("name", v)}
                    isRequired
                    isInvalid={!!errors.name}
                    errorMessage={errors.name}
                    classNames={{
                        input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                    }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TimeInput
                        label="Start Time"
                        value={startTimeValue}
                        onChange={(t) =>
                            handleInputChange(
                                "startTime",
                                t ? String(t.toString()).slice(0, 5) : ""
                            )
                        }
                        isRequired
                        isInvalid={!!errors.startTime}
                        errorMessage={errors.startTime}
                        className="w-full"
                    />

                    <TimeInput
                        label="End Time"
                        value={endTimeValue}
                        onChange={(t) =>
                            handleInputChange("endTime", t ? String(t.toString()).slice(0, 5) : "")
                        }
                        isRequired
                        isInvalid={!!errors.endTime}
                        errorMessage={errors.endTime}
                        className="w-full"
                    />
                </div>

                <Switch
                    isSelected={formData.isActive}
                    onValueChange={(v) => handleInputChange("isActive", v)}
                >
                    Active
                </Switch>
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

export function ShiftTemplateFormModal({
    isOpen,
    onClose,
    onSubmit,
    shift,
    isLoading = false,
}: ShiftTemplateFormModalProps) {
    const formKey = shift ? `edit-${shift.id}` : "create-new";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" backdrop="blur" scrollBehavior="inside">
            <ModalContent>
                {(onCloseModal) => (
                    <ShiftTemplateFormContent
                        key={formKey}
                        shift={shift}
                        onSubmit={onSubmit}
                        onClose={onCloseModal}
                        isLoading={isLoading}
                    />
                )}
            </ModalContent>
        </Modal>
    );
}
