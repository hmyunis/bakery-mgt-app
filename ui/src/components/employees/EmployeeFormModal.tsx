import { useMemo, useState } from "react";
import {
    Button,
    DatePicker,
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
import { Link2, RefreshCcw } from "lucide-react";
import type { DateValue } from "@internationalized/date";
import { parseDate } from "@internationalized/date";
import type { Employee } from "../../types/employee";
import type { CreateEmployeeData, UpdateEmployeeData } from "../../services/employeeService";
import { useUsers } from "../../hooks/useUsers";
import type { User } from "../../services/userService";

interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateEmployeeData | UpdateEmployeeData) => Promise<void>;
    employee?: Employee | null;
    isLoading?: boolean;
}

function EmployeeFormContent({
    employee,
    onSubmit,
    onClose,
    isLoading,
}: {
    employee?: Employee | null;
    onSubmit: (data: CreateEmployeeData | UpdateEmployeeData) => Promise<void>;
    onClose: () => void;
    isLoading: boolean;
}) {
    const isEdit = !!employee;

    const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);

    const [usersPage, setUsersPage] = useState(1);

    const [formData, setFormData] = useState({
        userId: employee?.userId ?? null,
        fullName: employee?.fullName || "",
        position: employee?.position || "",
        phoneNumber: employee?.phoneNumber || "",
        address: employee?.address || "",
        hireDate: employee?.hireDate || "",
        monthlyBaseSalary: employee?.monthlyBaseSalary?.toString() || "",
        paymentDetail: employee?.paymentDetail || "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data: usersData, isLoading: isUsersLoading } = useUsers({
        page: usersPage,
        pageSize: 5,
        ordering: "-date_joined",
    });

    const isLoadingMoreUsers = isUsersLoading && usersPage > 1;

    const users = useMemo(() => {
        const fromApi = usersData?.results ?? [];
        const fromEmployee = employee?.userSummary?.id
            ? ([
                  {
                      id: employee.userSummary.id,
                      username: employee.userSummary.username || "",
                      fullName: employee.userSummary.fullName,
                      email: employee.userSummary.email,
                      phoneNumber: employee.userSummary.phoneNumber,
                      role: (employee.userSummary.role || "admin") as User["role"],
                      address: undefined,
                  } as User,
              ] satisfies User[])
            : [];

        const merged = [...fromEmployee, ...fromApi];
        const seen = new Set<number>();
        return merged.filter((u) => {
            if (seen.has(u.id)) return false;
            seen.add(u.id);
            return true;
        });
    }, [employee, usersData?.results]);

    const selectedUserId = formData.userId ? Number(formData.userId) : null;
    const selectedUser = useMemo(
        () => (selectedUserId ? users.find((u) => u.id === selectedUserId) : undefined),
        [selectedUserId, users]
    );

    const hasMoreUsers = !!usersData?.next;

    const userSelectedKeys = useMemo(() => {
        return formData.userId ? new Set<string>([String(formData.userId)]) : new Set<string>();
    }, [formData.userId]);

    const handleInputChange = (field: string, value: string | number | null) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const validateForm = (): boolean => {
        const nextErrors: Record<string, string> = {};

        if (!formData.position.trim()) nextErrors.position = "Position is required";
        if (!formData.hireDate) nextErrors.hireDate = "Hire date is required";
        if (!formData.monthlyBaseSalary || Number(formData.monthlyBaseSalary) <= 0)
            nextErrors.monthlyBaseSalary = "Monthly base salary must be greater than 0";

        if (!formData.fullName.trim() && !formData.userId)
            nextErrors.fullName = "Full name is required";

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleAutofill = () => {
        if (!selectedUser || isLoading) return;

        setFormData((prev) => ({
            ...prev,
            fullName: selectedUser.fullName || "",
            phoneNumber: selectedUser.phoneNumber || "",
            address: selectedUser.address || "",
        }));
    };

    const handleLoadMoreUsers = async () => {
        if (isUsersLoading || isLoadingMoreUsers || !hasMoreUsers) return;
        setUsersPage((p) => p + 1);
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        const base = {
            userId: formData.userId,
            fullName: formData.fullName.trim() || undefined,
            position: formData.position.trim(),
            phoneNumber: formData.phoneNumber.trim() || undefined,
            address: formData.address.trim() || undefined,
            hireDate: formData.hireDate,
            monthlyBaseSalary: Number(formData.monthlyBaseSalary),
            paymentDetail: formData.paymentDetail.trim() || undefined,
        };

        await onSubmit(base as CreateEmployeeData | UpdateEmployeeData);
        onClose();
    };

    const hireDateValue = useMemo<DateValue | null>(() => {
        if (!formData.hireDate) return null;
        try {
            return parseDate(formData.hireDate);
        } catch {
            return null;
        }
    }, [formData.hireDate]);

    return (
        <>
            <ModalHeader>{isEdit ? "Edit Employee" : "Create New Employee"}</ModalHeader>
            <ModalBody className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                        label="Link User Account (optional)"
                        placeholder="Select a user"
                        selectedKeys={userSelectedKeys}
                        onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as string | undefined;
                            if (selected === "__load_more__") {
                                handleLoadMoreUsers();
                                setTimeout(() => setIsUserSelectOpen(true), 0);
                                return;
                            }

                            handleInputChange("userId", selected ? Number(selected) : null);
                        }}
                        isOpen={isUserSelectOpen}
                        onOpenChange={setIsUserSelectOpen}
                        isDisabled={isLoading || isUsersLoading}
                        classNames={{
                            trigger: "!w-full !text-left",
                            label: "!w-full !text-left",
                            base: "!w-full !text-left",
                            value: "!text-slate-900 dark:!text-slate-100",
                        }}
                        startContent={<Link2 className="h-4 w-4 text-slate-500" />}
                    >
                        <>
                            {users.map((u) => (
                                <SelectItem key={String(u.id)} textValue={u.fullName || u.username}>
                                    {u.fullName || u.username} ({u.username})
                                </SelectItem>
                            ))}

                            {hasMoreUsers && (
                                <SelectItem key="__load_more__" textValue="Load more">
                                    <div className="flex items-center gap-2">
                                        <RefreshCcw
                                            className={
                                                isUsersLoading || isLoadingMoreUsers
                                                    ? "h-4 w-4 animate-spin"
                                                    : "h-4 w-4"
                                            }
                                        />
                                        <span>Load more</span>
                                    </div>
                                </SelectItem>
                            )}
                        </>
                    </Select>

                    <div className="flex items-end gap-2">
                        <Button
                            variant="flat"
                            onPress={handleAutofill}
                            isDisabled={!selectedUserId || !selectedUser || isLoading}
                            className="w-full"
                            startContent={<RefreshCcw className="h-4 w-4" />}
                        >
                            Autofill from User
                        </Button>
                    </div>

                    <Input
                        label="Full Name"
                        value={formData.fullName}
                        onValueChange={(v) => handleInputChange("fullName", v)}
                        isInvalid={!!errors.fullName}
                        errorMessage={errors.fullName}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />

                    <Input
                        label="Position"
                        value={formData.position}
                        onValueChange={(v) => handleInputChange("position", v)}
                        isRequired
                        isInvalid={!!errors.position}
                        errorMessage={errors.position}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />

                    <Input
                        label="Phone Number"
                        value={formData.phoneNumber}
                        onValueChange={(v) => handleInputChange("phoneNumber", v)}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />

                    <DatePicker
                        label="Hire Date"
                        variant="bordered"
                        showMonthAndYearPickers
                        value={hireDateValue}
                        onChange={(date) =>
                            handleInputChange("hireDate", date ? date.toString() : "")
                        }
                        isRequired
                        isInvalid={!!errors.hireDate}
                        errorMessage={errors.hireDate}
                        className="w-full"
                    />

                    <Input
                        label="Monthly Base Salary"
                        type="number"
                        value={formData.monthlyBaseSalary}
                        onValueChange={(v) => handleInputChange("monthlyBaseSalary", v)}
                        isRequired
                        isInvalid={!!errors.monthlyBaseSalary}
                        errorMessage={errors.monthlyBaseSalary}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />

                    <Input
                        label="Address (optional)"
                        value={formData.address}
                        onValueChange={(v) => handleInputChange("address", v)}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />
                </div>

                <Textarea
                    label="Payment Detail (optional)"
                    value={formData.paymentDetail}
                    onValueChange={(v) => handleInputChange("paymentDetail", v)}
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
                    {isEdit ? "Save Changes" : "Create Employee"}
                </Button>
            </ModalFooter>
        </>
    );
}

export function EmployeeFormModal({
    isOpen,
    onClose,
    onSubmit,
    employee,
    isLoading = false,
}: EmployeeFormModalProps) {
    const formKey = employee ? `edit-${employee.id}` : "create-new";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl" backdrop="blur" scrollBehavior="inside">
            <ModalContent>
                {(onCloseModal) => (
                    <EmployeeFormContent
                        key={formKey}
                        employee={employee}
                        onSubmit={onSubmit}
                        onClose={onCloseModal}
                        isLoading={isLoading}
                    />
                )}
            </ModalContent>
        </Modal>
    );
}
