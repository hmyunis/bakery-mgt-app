import { useState, useEffect, useMemo } from "react";
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
    Select,
    SelectItem,
} from "@heroui/react";
import { Plus, Trash2, CreditCard } from "lucide-react";
import type { Product } from "../../types/production";
import type { PaymentMethod } from "../../types/payment";
import { usePaymentMethods } from "../../hooks/usePayment";
import { useCreateSale } from "../../hooks/useSales";
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

    // Filter out any inactive payment methods from current payments
    useEffect(() => {
        if (paymentMethods.length === 0 || payments.length === 0) return;
        
        const activePaymentMethodIds = new Set(paymentMethods.map((m) => m.id));
        const hasInactivePayments = payments.some((p) => !activePaymentMethodIds.has(p.method.id));
        
        if (hasInactivePayments) {
            setPayments((prev) =>
                prev.filter((p) => activePaymentMethodIds.has(p.method.id))
            );
        }
    }, [paymentMethods]);

    // Initialize with first payment method if available
    useEffect(() => {
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
    }, [isOpen, paymentMethods, totalAmount, payments.length]);

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
            toast.error("Cart is empty");
            return;
        }

        if (!isFullyPaid) {
            toast.error("Payment amount must cover the total bill");
            return;
        }

        if (payments.length === 0) {
            toast.error("Please add at least one payment method");
            return;
        }

        // Validate all payment methods are still active
        const activePaymentMethodIds = new Set(paymentMethods.map((m) => m.id));
        const inactivePayments = payments.filter((p) => !activePaymentMethodIds.has(p.method.id));
        if (inactivePayments.length > 0) {
            toast.error("One or more selected payment methods are no longer active. Please select different payment methods.");
            return;
        }

        // Validate all payment amounts are positive
        const invalidPayments = payments.filter((p) => p.amount <= 0);
        if (invalidPayments.length > 0) {
            toast.error("All payment amounts must be greater than zero");
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

            console.log("Submitting sale data:", saleData);
            await createSale(saleData);
            toast.success("Sale completed successfully!");
            onSuccess();
            onClose();
            setPayments([]);
        } catch (error: any) {
            console.error("Sale creation error:", error);
            toast.error(error?.response?.data?.message || "Failed to create sale");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        <span>Checkout</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        {/* Order Summary */}
                        <div>
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                Order Summary
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
                                            ETB{" "}
                                            {(item.product.selling_price * item.quantity).toFixed(
                                                2
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <Divider className="my-3" />
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    Total:
                                </span>
                                <span className="text-xl font-bold text-primary">
                                    ETB {totalAmount.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    Payment Methods
                                </h4>
                                {payments.length < paymentMethods.length && (
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        onPress={addPaymentMethod}
                                        startContent={<Plus className="h-4 w-4" />}
                                    >
                                        Add Payment
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
                                    const availableMethodItems = availableMethods.map((method) => ({
                                        key: method.id.toString(),
                                        label: method.name,
                                    }));

                                    return (
                                        <div
                                            key={index}
                                            className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                                        >
                                            <Select
                                                items={availableMethodItems}
                                                selectedKeys={
                                                    new Set([payment.method.id.toString()])
                                                }
                                                onSelectionChange={(keys) => {
                                                    const selectedKey = Array.from(keys)[0];
                                                    if (selectedKey) {
                                                        updatePaymentMethod(
                                                            index,
                                                            parseInt(selectedKey as string)
                                                        );
                                                    }
                                                }}
                                                placeholder="Select payment method"
                                                classNames={{
                                                    base: "flex-1 !w-full !text-left",
                                                    trigger:
                                                        "dark:!bg-zinc-800 !w-full !text-left !text-slate-900 dark:!text-slate-100",
                                                    value: "!text-slate-900 dark:!text-slate-100",
                                                    label: "!w-full !text-left !text-slate-700 dark:!text-slate-300",
                                                    selectorIcon:
                                                        "text-slate-500 dark:text-slate-400",
                                                }}
                                                selectionMode="single"
                                            >
                                                {(method) => (
                                                    <SelectItem key={method.key}>
                                                        {method.label}
                                                    </SelectItem>
                                                )}
                                            </Select>
                                            <div className="flex items-center gap-2 flex-1">
                                                <Input
                                                    type="number"
                                                    value={payment.amount.toFixed(2)}
                                                    onValueChange={(v) =>
                                                        updatePaymentAmount(index, parseFloat(v))
                                                    }
                                                    placeholder="0.00"
                                                    step="0.01"
                                                    min="0"
                                                    startContent={
                                                        <span className="text-zinc-500 text-sm">
                                                            ETB
                                                        </span>
                                                    }
                                                    classNames={{
                                                        input: "!text-slate-900 dark:!text-slate-100",
                                                    }}
                                                />
                                                {remainingAmount > 0 &&
                                                    index === payments.length - 1 && (
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            onPress={() =>
                                                                setRemainingAsAmount(index)
                                                            }
                                                        >
                                                            Use Remaining
                                                        </Button>
                                                    )}
                                            </div>
                                            {payments.length > 1 && (
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    color="danger"
                                                    onPress={() => removePaymentMethod(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {payments.length === 0 && (
                                <Alert color="warning" variant="flat" className="mt-2">
                                    Please add a payment method
                                </Alert>
                            )}
                        </div>

                        {/* Payment Summary */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-600 dark:text-zinc-400">
                                    Paid Amount:
                                </span>
                                <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                                    ETB {paidAmount.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-600 dark:text-zinc-400">Remaining:</span>
                                <span
                                    className={`font-medium ${
                                        remainingAmount > 0
                                            ? "text-danger-600 dark:text-danger-400"
                                            : "text-success-600 dark:text-success-400"
                                    }`}
                                >
                                    ETB {remainingAmount.toFixed(2)}
                                </span>
                            </div>
                            {remainingAmount < 0 && (
                                <Alert color="warning" variant="flat" className="mt-2">
                                    Change: ETB {Math.abs(remainingAmount).toFixed(2)}
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
                        Cancel
                    </Button>
                    <Button
                        color="primary"
                        onPress={handleSubmit}
                        isLoading={isCreating}
                        isDisabled={!isFullyPaid || payments.length === 0}
                        startContent={<CreditCard className="h-4 w-4" />}
                    >
                        Complete Sale
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
