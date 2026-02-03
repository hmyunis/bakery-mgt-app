import { Button, Input, Alert, Select, SelectItem, Divider, Switch } from "@heroui/react";
import { ChevronRight, ShoppingCart, Plus, Minus, X, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import type { Product } from "../../types/production";
import { getImageBaseUrl } from "../../lib/apiClient";
import { useMemo, useState } from "react";
import { usePaymentMethods } from "../../hooks/usePayment";
import { useCreateSale } from "../../hooks/useSales";
import type { ApiError } from "../../types/api";
import { toast } from "sonner";
import type { PaymentMethod } from "../../types/payment";

export interface CartItem {
    product: Product;
    quantity: number;
}

interface POSCartSidebarProps {
    items: CartItem[];
    onIncrement: (productId: number) => void;
    onDecrement: (productId: number) => void;
    onSetQuantity: (productId: number, quantity: number) => void;
    onRemove: (productId: number) => void;
    onSaleSuccess: () => void;
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
    className?: string;
}

interface SidebarContentProps {
    items: CartItem[];
    onIncrement: (productId: number) => void;
    onDecrement: (productId: number) => void;
    onSetQuantity: (productId: number, quantity: number) => void;
    onRemove: (productId: number) => void;
    onSaleSuccess: () => void;
    receiptIssued: boolean;
    setReceiptIssued: (value: boolean) => void;
}

interface PaymentEntryDraft {
    methodId: number;
    amount: string;
}

const SidebarContent = ({
    items,
    onIncrement,
    onDecrement,
    onSetQuantity,
    onRemove,
    onSaleSuccess,
    receiptIssued,
    setReceiptIssued,
}: SidebarContentProps) => {
    const getImageUrl = (image?: string): string | undefined => {
        if (!image) return undefined;
        if (image.startsWith("http")) return image;
        return `${getImageBaseUrl()}${image}`;
    };

    const [payments, setPayments] = useState<PaymentEntryDraft[]>([]);
    const { data: paymentMethodsData } = usePaymentMethods({ is_active: true });
    const { mutateAsync: createSale, isPending: isCreating } = useCreateSale();

    const paymentMethods = useMemo(() => {
        return (paymentMethodsData?.results || []).filter((method) => method.is_active === true);
    }, [paymentMethodsData]);

    const total = useMemo(() => {
        return items.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
    }, [items]);

    const paidAmount = useMemo(() => {
        return payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    }, [payments]);

    const remainingAmount = total - paidAmount;
    const isFullyPaid = remainingAmount <= 0;

    const getPaymentMethodById = (id: number): PaymentMethod | undefined => {
        return paymentMethods.find((m) => m.id === id);
    };

    const [lastAutoFilledAmount, setLastAutoFilledAmount] = useState<string | null>(null);
    const [prevInitKey, setPrevInitKey] = useState("");
    const initKey = `${items.length}:${total.toFixed(2)}:${paymentMethods
        .map((m) => m.id)
        .join(",")}`;
    if (items.length > 0 && paymentMethods.length > 0 && prevInitKey !== initKey) {
        setPrevInitKey(initKey);

        const activeIds = new Set(paymentMethods.map((m) => m.id));
        const nextPayments = payments
            .filter((p) => activeIds.has(p.methodId))
            .map((p) => ({
                ...p,
                methodId: activeIds.has(p.methodId) ? p.methodId : paymentMethods[0].id,
            }));

        const nextTotal = total.toFixed(2);

        if (nextPayments.length === 0) {
            setPayments([{ methodId: paymentMethods[0].id, amount: nextTotal }]);
            setLastAutoFilledAmount(nextTotal);
        } else if (
            nextPayments.length === 1 &&
            lastAutoFilledAmount !== null &&
            nextPayments[0].amount === lastAutoFilledAmount
        ) {
            setPayments([{ ...nextPayments[0], amount: nextTotal }]);
            setLastAutoFilledAmount(nextTotal);
        } else {
            setPayments(nextPayments);
        }
    }

    const addPaymentMethod = () => {
        if (paymentMethods.length === 0) return;
        const usedIds = new Set(payments.map((p) => p.methodId));
        const nextMethod = paymentMethods.find((m) => !usedIds.has(m.id));
        if (!nextMethod) return;
        setPayments([...payments, { methodId: nextMethod.id, amount: "" }]);
        setLastAutoFilledAmount(null);
    };

    const removePaymentMethod = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
        setLastAutoFilledAmount(null);
    };

    const updatePaymentMethod = (index: number, methodId: number) => {
        setPayments(payments.map((p, i) => (i === index ? { ...p, methodId } : p)));
        setLastAutoFilledAmount(null);
    };

    const updatePaymentAmount = (index: number, amount: string) => {
        setPayments(payments.map((p, i) => (i === index ? { ...p, amount } : p)));
        setLastAutoFilledAmount(null);
    };

    const setRemainingAsAmount = (index: number) => {
        if (remainingAmount <= 0) return;
        const current = parseFloat(payments[index]?.amount ?? "") || 0;
        const next = current + remainingAmount;
        updatePaymentAmount(index, next.toFixed(2));
    };

    const handleSubmit = async () => {
        if (items.length === 0) {
            toast.error("Cart is empty");
            return;
        }

        if (payments.length === 0) {
            toast.error("Please add at least one payment method");
            return;
        }

        if (!isFullyPaid) {
            toast.error("Payment amount must cover the total bill");
            return;
        }

        const activePaymentMethodIds = new Set(paymentMethods.map((m) => m.id));
        const hasInvalidMethod = payments.some((p) => !activePaymentMethodIds.has(p.methodId));
        if (hasInvalidMethod) {
            toast.error("One or more payment methods are invalid or inactive");
            return;
        }

        const hasZeroOrNegative = payments.some((p) => !((parseFloat(p.amount) || 0) > 0));
        if (hasZeroOrNegative) {
            toast.error("All payment amounts must be greater than zero");
            return;
        }

        const saleData = {
            items_input: items.map((item) => ({
                product_id: item.product.id,
                quantity: item.quantity,
            })),
            payments_input: payments.map((payment) => ({
                method_id: payment.methodId,
                amount: parseFloat((parseFloat(payment.amount) || 0).toFixed(2)),
            })),
            receipt_issued: receiptIssued,
        };

        try {
            await createSale(saleData);
            onSaleSuccess();
            setPayments([]);
            setLastAutoFilledAmount(null);
            setReceiptIssued(false);
        } catch (error) {
            console.error("Sale creation error:", error);
            const apiError = error as ApiError;
            const errorMessage =
                apiError.response?.data?.message || apiError.message || "Failed to create sale";
            toast.error(errorMessage);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto">
            {items.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 m-auto">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Your cart is empty</p>
                    <p className="text-sm">Add products to get started</p>
                </div>
            ) : (
                <>
                    {/* Cart Items */}
                    <div className="space-y-3 flex-grow overflow-y-auto pr-1">
                        {items.map((item) => {
                            const imageUrl = getImageUrl(item.product.image);
                            return (
                                <div
                                    key={item.product.id}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-16 h-16 bg-default-100 rounded-lg overflow-hidden flex-shrink-0">
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={item.product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-default-200 flex items-center justify-center text-2xl font-bold text-gray-400">
                                                    {item.product.name[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold line-clamp-1 text-slate-900 dark:text-slate-100">
                                                {item.product.name}
                                            </h4>
                                            {item.product.description && (
                                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                                    {item.product.description}
                                                </p>
                                            )}
                                            <p className="text-sm font-medium text-primary mt-2">
                                                ETB {item.product.selling_price.toFixed(2)}
                                            </p>
                                        </div>
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            color="danger"
                                            onPress={() => onRemove(item.product.id)}
                                            aria-label={`Remove ${item.product.name} from cart`}
                                            className="flex-shrink-0 p-2"
                                        >
                                            <Trash2 className="h-4 w-4 text-danger-600 dark:text-danger-400" />
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="bordered"
                                                onPress={() => onDecrement(item.product.id)}
                                                isDisabled={item.quantity <= 1}
                                            >
                                                <Minus className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                                            </Button>
                                            <Input
                                                type="number"
                                                value={String(item.quantity)}
                                                onValueChange={(v) => {
                                                    if (!v) return; // allow user to clear while typing
                                                    const parsed = Number.parseInt(v, 10);
                                                    if (Number.isNaN(parsed)) return;
                                                    onSetQuantity(item.product.id, parsed);
                                                }}
                                                min={1}
                                                max={item.product.stock_quantity}
                                                className="w-20"
                                                classNames={{
                                                    input: "text-center !text-slate-900 dark:!text-slate-100",
                                                    inputWrapper:
                                                        "!h-9 !min-h-9 !px-2 !bg-white dark:!bg-zinc-800",
                                                }}
                                            />
                                            <Button
                                                size="sm"
                                                variant="bordered"
                                                onPress={() => onIncrement(item.product.id)}
                                                isDisabled={
                                                    item.quantity >= item.product.stock_quantity
                                                }
                                            >
                                                <Plus className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                                            </Button>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                ETB{" "}
                                                {(
                                                    item.product.selling_price * item.quantity
                                                ).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Checkout */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 space-y-3">
                        <div className="space-y-4">
                            <Divider />

                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    Payment Methods
                                </h4>
                                {payments.length < paymentMethods.length && (
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        onPress={addPaymentMethod}
                                        startContent={<Plus className="h-4 w-4" />}
                                    >
                                        Add
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {payments.map((payment, index) => {
                                    const usedIds = new Set(
                                        payments
                                            .filter((_, i) => i !== index)
                                            .map((p) => p.methodId)
                                    );
                                    const availableMethods = paymentMethods.filter(
                                        (method) => !usedIds.has(method.id)
                                    );

                                    const selectedMethod =
                                        getPaymentMethodById(payment.methodId) ||
                                        availableMethods[0];
                                    const selectedId = selectedMethod?.id;

                                    const methodItems = availableMethods.map((method) => ({
                                        key: method.id.toString(),
                                        label: method.name,
                                    }));

                                    return (
                                        <div
                                            key={index}
                                            className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Select
                                                    items={methodItems}
                                                    selectedKeys={
                                                        selectedId
                                                            ? new Set([selectedId.toString()])
                                                            : new Set()
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
                                                    aria-label="Select payment method"
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

                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={payment.amount}
                                                        onValueChange={(v) =>
                                                            updatePaymentAmount(index, v)
                                                        }
                                                        placeholder="0"
                                                        startContent={
                                                            <span className="text-zinc-500 text-sm">
                                                                ETB
                                                            </span>
                                                        }
                                                        classNames={{
                                                            base: "w-28",
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
                                                                Remaining
                                                            </Button>
                                                        )}
                                                    {payments.length > 1 && (
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="light"
                                                            color="danger"
                                                            onPress={() =>
                                                                removePaymentMethod(index)
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {payments.length === 0 && (
                                <Alert color="warning" variant="flat">
                                    Please add a payment method
                                </Alert>
                            )}

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
                                    <span className="text-zinc-600 dark:text-zinc-400">
                                        Remaining:
                                    </span>
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
                                    <Alert color="warning" variant="flat">
                                        Change: ETB {Math.abs(remainingAmount).toFixed(2)}
                                    </Alert>
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        Total
                                    </span>
                                    <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                        ETB {total.toFixed(2)}
                                    </span>
                                </div>
                                <Button
                                    size="md"
                                    color="primary"
                                    onPress={handleSubmit}
                                    isLoading={isCreating}
                                    isDisabled={items.length === 0 || payments.length === 0}
                                    className="px-4"
                                >
                                    Complete Sale
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export function POSCartSidebar({
    items,
    onIncrement,
    onDecrement,
    onSetQuantity,
    onRemove,
    onSaleSuccess,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    className,
}: POSCartSidebarProps) {
    const [receiptIssued, setReceiptIssued] = useState(false);

    return (
        <>
            {/* --- Desktop Sidebar --- */}
            <div
                className={cn(
                    "hidden md:flex flex-col bg-background border-l border-gray-200 dark:border-gray-700 transition-all duration-300 max-w-full overflow-x-hidden",
                    isSidebarCollapsed ? "w-0" : "w-80",
                    className
                )}
            >
                <div
                    className={cn(
                        "flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700",
                        isSidebarCollapsed && "invisible"
                    )}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <h3 className="font-semibold text-lg">Your Cart</h3>
                        <Switch
                            size="sm"
                            isSelected={receiptIssued}
                            onValueChange={setReceiptIssued}
                            aria-label="Receipt issued"
                            classNames={{
                                label: "text-xs text-slate-600 dark:text-slate-300",
                            }}
                        >
                            Receipt
                        </Switch>
                    </div>
                    <Button
                        variant="light"
                        size="sm"
                        className="p-2"
                        onPress={() => setIsSidebarCollapsed(true)}
                        isIconOnly
                    >
                        <ChevronRight className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                    </Button>
                </div>
                {!isSidebarCollapsed && (
                    <SidebarContent
                        key={items.length === 0 ? "empty" : "filled"}
                        items={items}
                        onIncrement={onIncrement}
                        onDecrement={onDecrement}
                        onSetQuantity={onSetQuantity}
                        onRemove={onRemove}
                        onSaleSuccess={onSaleSuccess}
                        receiptIssued={receiptIssued}
                        setReceiptIssued={setReceiptIssued}
                    />
                )}
            </div>

            {/* --- Mobile Overlay --- */}
            {!isSidebarCollapsed && (
                <div className="md:hidden fixed inset-0 z-40 flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsSidebarCollapsed(true)}
                    ></div>

                    {/* Content */}
                    <div className="relative w-80 max-w-[90vw] h-full bg-background flex flex-col border-l border-gray-200 dark:border-gray-700 shadow-lg">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3 min-w-0">
                                <h3 className="font-semibold text-lg">Your Cart</h3>
                                <Switch
                                    size="sm"
                                    isSelected={receiptIssued}
                                    onValueChange={setReceiptIssued}
                                    aria-label="Receipt issued"
                                    classNames={{
                                        label: "text-xs text-slate-600 dark:text-slate-300",
                                    }}
                                >
                                    Receipt
                                </Switch>
                            </div>
                            <Button
                                variant="light"
                                size="sm"
                                onPress={() => setIsSidebarCollapsed(true)}
                                isIconOnly
                            >
                                <X className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                            </Button>
                        </div>
                        <SidebarContent
                            key={items.length === 0 ? "empty" : "filled"}
                            items={items}
                            onIncrement={onIncrement}
                            onDecrement={onDecrement}
                            onSetQuantity={onSetQuantity}
                            onRemove={onRemove}
                            onSaleSuccess={onSaleSuccess}
                            receiptIssued={receiptIssued}
                            setReceiptIssued={setReceiptIssued}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
