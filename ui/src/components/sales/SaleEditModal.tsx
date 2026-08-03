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
    Spinner,
    Switch,
} from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import { usePaymentMethods } from "../../hooks/usePayment";
import { useProducts } from "../../hooks/useProduction";
import type { Sale, UpdateSaleData } from "../../types/sales";

interface Props {
    isOpen: boolean;
    sale: Sale | null;
    isSaving: boolean;
    onClose: () => void;
    onSave: (data: UpdateSaleData) => Promise<void>;
}

function SaleEditForm({
    sale,
    isSaving,
    onClose,
    onSave,
}: Omit<Props, "isOpen" | "sale"> & { sale: Sale }) {
    const [items, setItems] = useState(
        sale.items.map((item) => ({ product_id: item.product, quantity: item.quantity }))
    );
    const [payments, setPayments] = useState(
        sale.payments.map((payment) => ({
            method_id: payment.method_id,
            amount: String(payment.amount),
        }))
    );
    const [receiptIssued, setReceiptIssued] = useState(!!sale.receipt_issued);
    const { data: productsData, isLoading: isLoadingProducts } = useProducts({
        page_size: 500,
    });
    const { data: methodsData, isLoading: isLoadingMethods } = usePaymentMethods({
        page_size: 500,
    });
    const products = useMemo(() => productsData?.results || [], [productsData]);
    const methods = useMemo(() => methodsData?.results || [], [methodsData]);

    const handleSave = async () => {
        await onSave({
            items_input: items,
            payments_input: payments.map((payment) => ({
                method_id: payment.method_id,
                amount: Number(payment.amount),
            })),
            receipt_issued: receiptIssued,
        });
    };

    if (isLoadingProducts || isLoadingMethods) {
        return (
            <ModalBody className="items-center py-12">
                <Spinner />
            </ModalBody>
        );
    }

    return (
        <>
            <ModalHeader>Edit Sale #{sale.id}</ModalHeader>
            <ModalBody className="space-y-5">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Items</h3>
                        <Button
                            size="sm"
                            variant="flat"
                            startContent={<Plus className="h-4 w-4" />}
                            isDisabled={items.length >= products.length}
                            onPress={() => {
                                const product = products.find(
                                    (candidate) =>
                                        !items.some((item) => item.product_id === candidate.id)
                                );
                                if (product)
                                    setItems([...items, { product_id: product.id, quantity: 1 }]);
                            }}
                        >
                            Add Item
                        </Button>
                    </div>
                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-[1fr_7rem_auto] gap-2">
                            <Select
                                aria-label="Product"
                                selectedKeys={new Set([String(item.product_id)])}
                                onSelectionChange={(keys) => {
                                    const id = Number(Array.from(keys)[0]);
                                    setItems(
                                        items.map((row, i) =>
                                            i === index ? { ...row, product_id: id } : row
                                        )
                                    );
                                }}
                                classNames={{
                                    base: "!w-full !text-left",
                                    trigger: "!w-full !text-left",
                                    label: "!w-full !text-left",
                                    value: "!text-slate-900 dark:!text-slate-100",
                                }}
                            >
                                {products.map((product) => (
                                    <SelectItem
                                        key={String(product.id)}
                                        isDisabled={
                                            !product.is_active &&
                                            !sale.items.some(
                                                (saleItem) => saleItem.product === product.id
                                            )
                                        }
                                    >
                                        {product.name}
                                    </SelectItem>
                                ))}
                            </Select>
                            <Input
                                aria-label="Quantity"
                                type="number"
                                min={1}
                                value={String(item.quantity)}
                                onValueChange={(value) =>
                                    setItems(
                                        items.map((row, i) =>
                                            i === index
                                                ? {
                                                      ...row,
                                                      quantity: Math.max(1, Number(value) || 1),
                                                  }
                                                : row
                                        )
                                    )
                                }
                            />
                            <Button
                                isIconOnly
                                color="danger"
                                variant="light"
                                aria-label="Remove item"
                                isDisabled={items.length === 1}
                                onPress={() => setItems(items.filter((_, i) => i !== index))}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Payments</h3>
                        <Button
                            size="sm"
                            variant="flat"
                            startContent={<Plus className="h-4 w-4" />}
                            isDisabled={payments.length >= methods.length}
                            onPress={() => {
                                const method = methods.find(
                                    (candidate) =>
                                        candidate.is_active &&
                                        !payments.some(
                                            (payment) => payment.method_id === candidate.id
                                        )
                                );
                                if (method)
                                    setPayments([
                                        ...payments,
                                        { method_id: method.id, amount: "" },
                                    ]);
                            }}
                        >
                            Add Payment
                        </Button>
                    </div>
                    {payments.map((payment, index) => (
                        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                            <Select
                                aria-label="Payment method"
                                selectedKeys={new Set([String(payment.method_id)])}
                                onSelectionChange={(keys) => {
                                    const id = Number(Array.from(keys)[0]);
                                    setPayments(
                                        payments.map((row, i) =>
                                            i === index ? { ...row, method_id: id } : row
                                        )
                                    );
                                }}
                                classNames={{
                                    base: "!w-full !text-left",
                                    trigger: "!w-full !text-left",
                                    label: "!w-full !text-left",
                                    value: "!text-slate-900 dark:!text-slate-100",
                                }}
                            >
                                {methods.map((method) => (
                                    <SelectItem
                                        key={String(method.id)}
                                        isDisabled={
                                            !method.is_active && method.id !== payment.method_id
                                        }
                                    >
                                        {method.name}
                                    </SelectItem>
                                ))}
                            </Select>
                            <Input
                                aria-label="Payment amount"
                                type="number"
                                min={0.01}
                                step="0.01"
                                value={payment.amount}
                                onValueChange={(amount) =>
                                    setPayments(
                                        payments.map((row, i) =>
                                            i === index ? { ...row, amount } : row
                                        )
                                    )
                                }
                            />
                            <Button
                                isIconOnly
                                color="danger"
                                variant="light"
                                aria-label="Remove payment"
                                onPress={() => setPayments(payments.filter((_, i) => i !== index))}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Switch isSelected={receiptIssued} onValueChange={setReceiptIssued}>
                    Receipt issued
                </Switch>
            </ModalBody>
            <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                    Cancel
                </Button>
                <Button color="primary" isLoading={isSaving} onPress={handleSave}>
                    Save Changes
                </Button>
            </ModalFooter>
        </>
    );
}

export function SaleEditModal({ isOpen, sale, isSaving, onClose, onSave }: Props) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
            <ModalContent>
                {sale ? (
                    <SaleEditForm
                        key={sale.id}
                        sale={sale}
                        isSaving={isSaving}
                        onClose={onClose}
                        onSave={onSave}
                    />
                ) : null}
            </ModalContent>
        </Modal>
    );
}
