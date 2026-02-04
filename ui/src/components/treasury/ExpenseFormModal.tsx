import { useMemo, useState } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Textarea,
    Select,
    SelectItem,
    DatePicker,
} from "@heroui/react";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import type { DateValue } from "@react-types/datepicker";
import type { BankAccount, CreateExpenseData, Expense } from "../../types/treasury";

interface ExpenseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    expense?: Expense | null;
    accounts: BankAccount[];
    onSave: (payload: CreateExpenseData) => void;
}

const createEmptyExpense = (): CreateExpenseData => ({
    title: "",
    amount: 0,
    status: "pending",
    accountId: null,
    notes: "",
    createdAt: new Date().toISOString(),
});

const getInitialDate = (expense?: Expense | null) => {
    if (expense?.createdAt) {
        const dateOnly = expense.createdAt.slice(0, 10);
        return parseDate(dateOnly);
    }
    return today(getLocalTimeZone());
};

export function ExpenseFormModal({
    isOpen,
    onClose,
    expense,
    accounts,
    onSave,
}: ExpenseFormModalProps) {
    const isEdit = !!expense;
    const [formData, setFormData] = useState<CreateExpenseData>(() =>
        expense
            ? {
                  title: expense.title,
                  amount: expense.amount,
                  status: expense.status,
                  accountId: expense.accountId ?? null,
                  notes: expense.notes || "",
                  createdAt: expense.createdAt,
              }
            : createEmptyExpense()
    );
    const [dateValue, setDateValue] = useState<DateValue>(() => getInitialDate(expense));
    const [errors, setErrors] = useState<Record<string, string>>({});

    const selectedAccountKeys = useMemo(
        () =>
            new Set([
                formData.accountId !== null && formData.accountId !== undefined
                    ? String(formData.accountId)
                    : "none",
            ]),
        [formData.accountId]
    );

    const handleChange = (field: keyof CreateExpenseData, value: string | number | null) => {
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
        if (!formData.title.trim()) nextErrors.title = "Required";
        if (!dateValue) nextErrors.createdAt = "Required";
        if (!formData.amount || Number.isNaN(Number(formData.amount))) {
            nextErrors.amount = "Enter a valid amount";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        try {
            await onSave({
                ...formData,
                amount: Number(formData.amount),
                createdAt: new Date(dateValue.toString()).toISOString(),
                notes: formData.notes?.trim() || undefined,
            });
            onClose();
        } catch {
            // Errors handled by hook; keep modal open
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" backdrop="blur">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <span className="text-lg font-semibold">
                        {isEdit ? "Edit Expense" : "Add Expense"}
                    </span>
                    <span className="text-sm text-slate-500">
                        Record operating costs, vendor payments, or miscellaneous expenses.
                    </span>
                </ModalHeader>
                <ModalBody className="space-y-4">
                    <Input
                        autoFocus
                        label="Expense Title"
                        placeholder="e.g. Flour purchase"
                        value={formData.title}
                        onValueChange={(value) => handleChange("title", value)}
                        isInvalid={!!errors.title}
                        errorMessage={errors.title}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />
                    <DatePicker
                        label="Expense Date"
                        variant="bordered"
                        showMonthAndYearPickers
                        value={dateValue}
                        onChange={(value) => {
                            if (value) setDateValue(value);
                        }}
                        isRequired
                        isInvalid={!!errors.createdAt}
                        errorMessage={errors.createdAt}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100",
                            inputWrapper:
                                "!placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            type="number"
                            label="Amount (ETB)"
                            placeholder="0.00"
                            value={formData.amount ? String(formData.amount) : ""}
                            onValueChange={(value) =>
                                handleChange("amount", value.trim() ? Number(value) : 0)
                            }
                            isInvalid={!!errors.amount}
                            errorMessage={errors.amount}
                            classNames={{
                                input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                            }}
                        />
                        <Select
                            label="Status"
                            selectedKeys={new Set([formData.status])}
                            onSelectionChange={(keys) => {
                                if (keys === "all") return;
                                const next = Array.from(keys)[0];
                                if (next === "paid" || next === "pending") {
                                    handleChange("status", next);
                                }
                            }}
                            classNames={{
                                base: "!w-full !text-left",
                                trigger: "!w-full !text-left",
                                label: "!w-full !text-left",
                                value: "!text-slate-900 dark:!text-slate-100",
                            }}
                        >
                            <SelectItem key="pending">Pending</SelectItem>
                            <SelectItem key="paid">Paid</SelectItem>
                        </Select>
                    </div>
                    <Select
                        label="Bank Account (optional)"
                        selectedKeys={selectedAccountKeys}
                        onSelectionChange={(keys) => {
                            if (keys === "all") return;
                            const next = Array.from(keys)[0];
                            if (next === "none") {
                                handleChange("accountId", null);
                                return;
                            }
                            const parsed =
                                typeof next === "number" ? next : Number.parseInt(String(next), 10);
                            handleChange("accountId", Number.isNaN(parsed) ? null : parsed);
                        }}
                        classNames={{
                            base: "!w-full !text-left",
                            trigger: "!w-full !text-left",
                            label: "!w-full !text-left",
                            value: "!text-slate-900 dark:!text-slate-100",
                        }}
                    >
                        <>
                            <SelectItem key="none">No bank account</SelectItem>
                            {accounts.map((account) => (
                                <SelectItem
                                    key={account.id}
                                    textValue={`${account.name} • ${account.bankName}`}
                                >
                                    {account.name} • {account.bankName}
                                </SelectItem>
                            ))}
                        </>
                    </Select>
                    <Textarea
                        label="Notes (optional)"
                        placeholder="Additional details"
                        value={formData.notes || ""}
                        onValueChange={(value) => handleChange("notes", value)}
                        minRows={2}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />
                </ModalBody>
                <ModalFooter>
                    <Button variant="flat" color="default" onPress={onClose}>
                        Cancel
                    </Button>
                    <Button color="primary" onPress={handleSubmit}>
                        {isEdit ? "Save Expense" : "Add Expense"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
