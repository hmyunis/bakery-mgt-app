import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Chip,
    Divider,
} from "@heroui/react";
import { Receipt, Calendar, User, CreditCard, Package, Trash2 } from "lucide-react";
import type { Sale } from "../../types/sales";

interface SaleDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: Sale | null;
    canDelete?: boolean;
    onDelete?: (sale: Sale) => void;
}

export function SaleDetailModal({
    isOpen,
    onClose,
    sale,
    canDelete = false,
    onDelete,
}: SaleDetailModalProps) {
    if (!sale) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Receipt className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                Sale #{sale.id}
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Receipt Details
                            </p>
                        </div>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-6">
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        Date & Time
                                    </p>
                                </div>
                                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    {new Date(sale.created_at).toLocaleString()}
                                </p>
                            </div>

                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        Cashier
                                    </p>
                                </div>
                                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    {sale.cashier_name || "-"}
                                </p>
                            </div>
                        </div>

                        {/* Items */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Package className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                    Items ({sale.items.length})
                                </p>
                            </div>
                            <div className="space-y-2">
                                {sale.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex justify-between items-center p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                                {item.product_name}
                                            </p>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                ETB {item.unit_price.toFixed(2)} × {item.quantity}
                                            </p>
                                        </div>
                                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            ETB {item.subtotal.toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Divider />

                        {/* Payment Methods */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <CreditCard className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                    Payment Methods ({sale.payments.length})
                                </p>
                            </div>
                            <div className="space-y-2">
                                {sale.payments.map((payment, index) => (
                                    <div
                                        key={index}
                                        className="flex justify-between items-center p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                                    >
                                        <Chip variant="flat" size="sm">
                                            {payment.method__name}
                                        </Chip>
                                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            ETB {payment.amount.toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Total */}
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    Total Amount:
                                </span>
                                <span className="text-2xl font-bold text-primary">
                                    ETB {sale.total_amount.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    {canDelete && onDelete && (
                        <Button
                            color="danger"
                            variant="flat"
                            onPress={() => onDelete(sale)}
                            startContent={<Trash2 className="h-4 w-4" />}
                        >
                            Delete
                        </Button>
                    )}
                    <Button
                        variant="flat"
                        onPress={onClose}
                        className="!text-zinc-700 dark:!text-zinc-300"
                    >
                        Close
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

