import { tr } from "../../locales";
import { useState, useMemo } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Divider,
    Alert,
} from "@heroui/react";
import { Plus, Trash2, CreditCard } from "lucide-react";
import type { Product } from "../../types/production";
import type { PaymentMethod } from "../../types/payment";
import { usePaymentMethods } from "../../hooks/usePayment";
import { useCreateSale } from "../../hooks/useSales";
import type { ApiError } from "../../types/api";
import { toast } from "sonner";

interface CartItem {
    product: Product;
    quantity: number;
}

interface PaymentEntry {
    method: PaymentMethod;
    amount: number;
}

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onSuccess: () => void;
}

export function CheckoutModal({ isOpen, onClose, cartItems, onSuccess }: CheckoutModalProps) {
    const [payments, setPayments] = useState<PaymentEntry[]>([]);
    const { data: paymentMethodsData } = usePaymentMethods({ is_active: true });
    const { mutateAsync: createSale, isPending: isCreating } = useCreateSale();

    const paymentMethods = useMemo(() => {
        return (paymentMethodsData?.results || []).filter((method) => method.is_active === true);
    }, [paymentMethodsData]);
    const totalAmount = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
    }, [cartItems]);

    const paidAmount = useMemo(() => {
        return payments.reduce((sum, payment) => sum + payment.amount, 0);
    }, [payments]);

    const remainingAmount = totalAmount - paidAmount;
    const isFullyPaid = remainingAmount <= 0;

    const [prevPaymentMethods, setPrevPaymentMethods] = useState(paymentMethods);
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

    if (paymentMethods !== prevPaymentMethods || isOpen !== prevIsOpen) {
        setPrevPaymentMethods(paymentMethods);
        setPrevIsOpen(isOpen);

        // Filter out any inactive payment methods from current payments
        if (paymentMethods.length > 0 && payments.length > 0) {
            const activePaymentMethodIds = new Set(paymentMethods.map((m) => m.id));
            const hasInactivePayments = payments.some(
                (p) => !activePaymentMethodIds.has(p.method.id)
            );

            if (hasInactivePayments) {
                setPayments((prev) => prev.filter((p) => activePaymentMethodIds.has(p.method.id)));
            }
        }

        // Initialize with first payment method if available
        if (isOpen && paymentMethods.length > 0 && payments.length === 0) {
            const firstActiveMethod = paymentMethods.find((m) => m.is_active === true);
            if (firstActiveMethod) {
                setPayments([
                    {
                        method: firstActiveMethod,
                        amount: totalAmount,
                    },
                ]);
            }
        }
    }

    const addPaymentMethod = () => {
        if (paymentMethods.length === 0) return;
        const availableMethods = paymentMethods.filter(
            (method) => !payments.some((p) => p.method.id === method.id)
        );
        if (availableMethods.length > 0) {
            setPayments([
                ...payments,
                {
                    method: availableMethods[0],
                    amount: 0,
                },
            ]);
        }
    };

    const removePaymentMethod = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const updatePaymentMethod = (index: number, methodId: number) => {
        const method = paymentMethods.find((m) => m.id === methodId);
        if (method) {
            setPayments(payments.map((p, i) => (i === index ? { ...p, method } : p)));
        }
    };

    const updatePaymentAmount = (index: number, amount: number) => {
        setPayments(
            payments.map((p, i) => (i === index ? { ...p, amount: Math.max(0, amount) } : p))
        );
    };

    const setRemainingAsAmount = (index: number) => {
        if (remainingAmount > 0) {
            updatePaymentAmount(index, remainingAmount);
        }
    };

    const handleSubmit = async () => {
        if (cartItems.length === 0) {
            toast.error(tr("Cart is empty"));
            return;
        }

        if (!isFullyPaid) {
            toast.error(tr("Payment amount must cover the total bill"));
            return;
        }

        if (payments.length === 0) {
            toast.error(tr("Please add at least one payment method"));
            return;
        }

        // Validate all payment methods are still active
        const activePaymentMethodIds = new Set(paymentMethods.map((m) => m.id));
        const inactivePayments = payments.filter((p) => !activePaymentMethodIds.has(p.method.id));
        if (inactivePayments.length > 0) {
            toast.error(
                tr(
                    "One or more selected payment methods are no longer active. Please select different payment methods."
                )
            );
            return;
        }

        // Validate all payment amounts are positive
        const invalidPayments = payments.filter((p) => p.amount <= 0);
        if (invalidPayments.length > 0) {
            toast.error(tr("All payment amounts must be greater than zero"));
            return;
        }

        try {
            const saleData = {
                items_input: cartItems.map((item) => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                })),
                payments_input: payments.map((payment) => ({
                    method_id: payment.method.id,
                    amount: parseFloat(payment.amount.toFixed(2)),
                })),
            };

            await createSale(saleData);
            onSuccess();
            onClose();
            setPayments([]);
        } catch (error) {
            console.error("Sale creation error:", error);
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message || apiError.message || "Failed to create sale";
            toast.error(errorMessage);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        <span>{tr("Checkout")}</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        {/* Order Summary */}
                        <div>
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                {tr("Order Summary")}
                            </h4>
                            <div className="space-y-2">
                                {cartItems.map((item) => (
                                    <div
                                        key={item.product.id}
                                        className="flex justify-between text-sm"
                                    >
                                        <span className="text-zinc-600 dark:text-zinc-400">
                                            {item.product.name} × {item.quantity}
                                        </span>
                                        <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                                            {(item.product.selling_price * item.quantity).toFixed(
                                                2
                                            )}{" "}
                                            {tr("Birr")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <Divider className="my-3" />
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    {tr("Total:")}
                                </span>
                                <span className="text-xl font-bold text-primary">
                                    {totalAmount.toFixed(2)} {tr("Birr")}
                                </span>
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {tr("Payment Methods")}
                                </h4>
                                {payments.length < paymentMethods.length && (
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        onPress={addPaymentMethod}
                                        startContent={<Plus className="h-4 w-4" />}
                                    >
                                        {tr("Add Payment")}
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {payments.map((payment, index) => {
                                    const availableMethods = paymentMethods.filter(
                                        (method) =>
                                            method.is_active === true &&
                                            !payments.some(
                                                (p, i) => i !== index && p.method.id === method.id
                                            )
                                    );
                                    return (
                                        <div
                                            key={index}
                                            className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2 bg-zinc-50/50 dark:bg-zinc-900/40"
                                        >
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={
                                                        payment.method?.id
                                                            ? String(payment.method.id)
                                                            : ""
                                                    }
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        if (val) updatePaymentMethod(index, val);
                                                    }}
                                                    aria-label={tr("Select payment method")}
                                                    className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                                >
                                                    {availableMethods.map((m) => (
                                                        <option
                                                            key={m.id}
                                                            value={m.id}
                                                            className="bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100"
                                                        >
                                                            {m.name}
                                                        </option>
                                                    ))}
                                                </select>

                                                <Input
                                                    type="number"
                                                    value={payment.amount.toFixed(2)}
                                                    onValueChange={(v) =>
                                                        updatePaymentAmount(
                                                            index,
                                                            parseFloat(v) || 0
                                                        )
                                                    }
                                                    placeholder="0.00"
                                                    step="0.01"
                                                    min="0"
                                                    endContent={
                                                        <span className="text-zinc-500 text-xs">
                                                            {tr("Birr")}
                                                        </span>
                                                    }
                                                    classNames={{
                                                        base: "w-28 flex-shrink-0",
                                                        input: "!text-slate-900 dark:!text-slate-100 font-semibold",
                                                        inputWrapper:
                                                            "!h-10 !min-h-10 !bg-white dark:!bg-zinc-800",
                                                    }}
                                                />
                                                {remainingAmount > 0 &&
                                                    index === payments.length - 1 && (
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            className="h-10 font-medium flex-shrink-0"
                                                            onPress={() =>
                                                                setRemainingAsAmount(index)
                                                            }
                                                        >
                                                            {tr("Remaining")}
                                                        </Button>
                                                    )}
                                                {payments.length > 1 && (
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        color="danger"
                                                        className="h-10 w-10 flex-shrink-0"
                                                        onPress={() => removePaymentMethod(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {payments.length === 0 && (
                                <Alert color="warning" variant="flat" className="mt-2">
                                    {tr("Please add a payment method")}
                                </Alert>
                            )}
                        </div>

                        {/* Payment Summary */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-600 dark:text-zinc-400">
                                    {tr("Paid Amount:")}
                                </span>
                                <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                                    {paidAmount.toFixed(2)} {tr("Birr")}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-600 dark:text-zinc-400">
                                    {tr("Remaining:")}
                                </span>
                                <span
                                    className={`font-medium ${
                                        remainingAmount > 0
                                            ? "text-danger-600 dark:text-danger-400"
                                            : "text-success-600 dark:text-success-400"
                                    }`}
                                >
                                    {remainingAmount.toFixed(2)} {tr("Birr")}
                                </span>
                            </div>
                            {remainingAmount < 0 && (
                                <Alert color="warning" variant="flat" className="mt-2">
                                    {tr("Change:")} {Math.abs(remainingAmount).toFixed(2)}{" "}
                                    {tr("Birr")}
                                </Alert>
                            )}
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="flat"
                        onPress={onClose}
                        isDisabled={isCreating}
                        className="!text-zinc-700 dark:!text-zinc-300"
                    >
                        {tr("Cancel")}
                    </Button>
                    <Button
                        color="primary"
                        onPress={handleSubmit}
                        isLoading={isCreating}
                        isDisabled={!isFullyPaid || payments.length === 0}
                        startContent={<CreditCard className="h-4 w-4" />}
                    >
                        {tr("Complete Sale")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
