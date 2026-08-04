import { tr } from "../../locales";
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
} from "@heroui/react";
import { useState } from "react";
import type { Sale } from "../../types/sales";

interface PaymentStatusModalProps {
    isOpen: boolean;
    sale: Sale | null;
    isSubmitting?: boolean;
    onClose: () => void;
    onSubmit: (data: {
        payment_status: "paid" | "unpaid_approved";
        unpaid_reason?: string;
    }) => Promise<void>;
}

export function PaymentStatusModal({
    isOpen,
    sale,
    isSubmitting = false,
    onClose,
    onSubmit,
}: PaymentStatusModalProps) {
    const formKey = `${sale?.id ?? "none"}-${isOpen ? "open" : "closed"}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent>
                <PaymentStatusForm
                    key={formKey}
                    sale={sale}
                    isSubmitting={isSubmitting}
                    onClose={onClose}
                    onSubmit={onSubmit}
                />
            </ModalContent>
        </Modal>
    );
}

interface PaymentStatusFormProps {
    sale: Sale | null;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: PaymentStatusModalProps["onSubmit"];
}

function PaymentStatusForm({ sale, isSubmitting, onClose, onSubmit }: PaymentStatusFormProps) {
    const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid_approved">(
        sale?.payment_status || "paid"
    );
    const [unpaidReason, setUnpaidReason] = useState(sale?.unpaid_reason || "");

    const handleSubmit = async () => {
        const reason = unpaidReason.trim();
        await onSubmit({
            payment_status: paymentStatus,
            unpaid_reason: paymentStatus === "unpaid_approved" ? reason : "",
        });
    };

    return (
        <>
            <ModalHeader>{tr("Update Payment Status")}</ModalHeader>
            <ModalBody className="space-y-3">
                <Select
                    label={tr("Payment Status")}
                    selectedKeys={new Set([paymentStatus])}
                    onSelectionChange={(keys) => {
                        const key = Array.from(keys)[0] as "paid" | "unpaid_approved" | undefined;
                        if (!key) return;
                        setPaymentStatus(key);
                    }}
                    selectionMode="single"
                    classNames={{
                        base: "!w-full md:!w-full lg:!w-80 !text-left",
                        trigger: "!w-full md:!w-full lg:!w-80 !text-left",
                        label: "!w-full md:!w-full lg:!w-80 !text-left",
                        value: "!text-slate-900 dark:!text-slate-100",
                    }}
                >
                    <SelectItem key="paid">{tr("Paid")}</SelectItem>
                    <SelectItem key="unpaid_approved">{tr("Unpaid")}</SelectItem>
                </Select>

                {paymentStatus === "unpaid_approved" && (
                    <Input
                        label={tr("Reason")}
                        placeholder={tr("Why this sale is unpaid")}
                        value={unpaidReason}
                        onValueChange={setUnpaidReason}
                        isRequired
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100",
                        }}
                    />
                )}
            </ModalBody>
            <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                    {tr("Cancel")}
                </Button>
                <Button
                    color="primary"
                    onPress={handleSubmit}
                    isLoading={isSubmitting}
                    isDisabled={paymentStatus === "unpaid_approved" && !unpaidReason.trim()}
                >
                    {tr("Save")}
                </Button>
            </ModalFooter>
        </>
    );
}
