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
    Chip,
} from "@heroui/react";
import type { BankAccount } from "../../types/treasury";

interface BankTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: BankAccount | null;
    mode: "deposit" | "withdrawal";
    transaction?: {
        id: number;
        accountId: number;
        type: "deposit" | "withdrawal";
        amount: number;
        notes?: string;
    } | null;
    onSubmit: (payload: {
        accountId: number;
        type: "deposit" | "withdrawal";
        amount: number;
        notes?: string;
    }) => Promise<void>;
}

export function BankTransactionModal({
    isOpen,
    onClose,
    account,
    mode,
    transaction,
    onSubmit,
}: BankTransactionModalProps) {
    const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
    const [notes, setNotes] = useState(transaction?.notes || "");
    const [errors, setErrors] = useState<Record<string, string>>({});

    const title = transaction
        ? "Edit Transaction"
        : mode === "deposit"
          ? "Deposit Funds"
          : "Withdraw Funds";
    const toneColor = mode === "deposit" ? "success" : "danger";

    const canSubmit = useMemo(() => {
        if (!account && !transaction) return false;
        if (!amount.trim() || Number.isNaN(Number(amount))) return false;
        return true;
    }, [account, amount, transaction]);

    const resetForm = () => {
        setAmount("");
        setNotes("");
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        const activeAccountId = transaction?.accountId || account?.id;
        if (!activeAccountId) return;
        const nextErrors: Record<string, string> = {};

        if (!amount.trim() || Number.isNaN(Number(amount))) {
            nextErrors.amount = "Enter a valid amount";
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        try {
            await onSubmit({
                accountId: activeAccountId,
                type: transaction?.type || mode,
                amount: Number(amount),
                notes: notes.trim() || undefined,
            });
            handleClose();
        } catch {
            // Errors handled by hook; keep modal open
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="lg" backdrop="blur">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <span>{title}</span>
                        <Chip size="sm" variant="flat" color={toneColor}>
                            {mode === "deposit" ? "Deposit" : "Withdraw"}
                        </Chip>
                    </div>
                    <p className="text-sm text-slate-500">
                        {account
                            ? `Account: ${account.name} • ${account.bankName}`
                            : "Select a bank account"}
                    </p>
                </ModalHeader>
                <ModalBody className="space-y-4">
                    <Input
                        label="Amount (ETB)"
                        type="number"
                        placeholder="0"
                        value={amount}
                        onValueChange={(value) => setAmount(value)}
                        errorMessage={errors.amount}
                        isInvalid={!!errors.amount}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100",
                            inputWrapper:
                                "!placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />
                    <Textarea
                        label="Notes (optional)"
                        placeholder="Additional details"
                        value={notes}
                        onValueChange={(value) => setNotes(value)}
                        minRows={2}
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100",
                            inputWrapper:
                                "!placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />
                </ModalBody>
                <ModalFooter>
                    <Button variant="light" onPress={handleClose}>
                        Cancel
                    </Button>
                    <Button color="primary" onPress={handleSubmit} isDisabled={!canSubmit}>
                        Save Transaction
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
