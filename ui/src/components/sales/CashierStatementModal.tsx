import { useMemo, useState } from "react";
import {
    Button,
    Chip,
    DatePicker,
    Divider,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Spinner,
} from "@heroui/react";
import { type ColumnDef } from "@tanstack/react-table";
import { now, getLocalTimeZone, type DateValue } from "@internationalized/date";
import { CreditCard, PackageSearch, ReceiptText, Wallet } from "lucide-react";
import { useCashierStatement } from "../../hooks/useSales";
import type { Sale } from "../../types/sales";
import { DataTable } from "../ui/DataTable";

interface CashierStatementModalProps {
    isOpen: boolean;
    onClose: () => void;
    cashierId: number | null;
}

const formatMoney = (amount: number) => `ETB ${amount.toFixed(2)}`;

const formatDateTime = (value: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
};

const getDefaultRange = () => {
    const end = now(getLocalTimeZone());
    const start = end.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    return {
        start,
        end,
    };
};

const toIsoOrUndefined = (value: DateValue | null) => {
    if (!value) return undefined;
    const withAbsolute = value as DateValue & { toAbsoluteString?: () => string };
    if (typeof withAbsolute.toAbsoluteString === "function") {
        return withAbsolute.toAbsoluteString();
    }

    const date = new Date(value.toString());
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export function CashierStatementModal({ isOpen, onClose, cashierId }: CashierStatementModalProps) {
    const [range, setRange] = useState<{
        start: DateValue | null;
        end: DateValue | null;
    }>(() => getDefaultRange());

    const statementParams = useMemo(() => {
        if (!cashierId || !isOpen) return null;
        return {
            cashier: cashierId,
            start_time: toIsoOrUndefined(range.start),
            end_time: toIsoOrUndefined(range.end),
        };
    }, [cashierId, isOpen, range.start, range.end]);

    const { data, isLoading, isFetching, isError } = useCashierStatement(statementParams, {
        enabled: isOpen && !!cashierId && !!range.start && !!range.end,
    });

    const cashierDetailLine = useMemo(() => {
        if (!data?.cashier) return "Select a cashier";

        const parts = [
            data.cashier.fullName || data.cashier.username,
            `@${data.cashier.username}`,
            `ID: ${data.cashier.id}`,
            data.cashier.phoneNumber || "-",
        ];
        return parts.join(" • ");
    }, [data]);

    const saleColumns = useMemo<ColumnDef<Sale>[]>(
        () => [
            {
                accessorKey: "created_at",
                header: "Time",
                cell: ({ row }) => (
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                        {formatDateTime(row.original.created_at)}
                    </span>
                ),
            },
            {
                accessorKey: "id",
                header: "Sale #",
                cell: ({ row }) => (
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                        #{row.original.id}
                    </span>
                ),
            },
            {
                id: "products",
                header: "Products",
                cell: ({ row }) => {
                    const items = row.original.items ?? [];
                    if (!items.length) return <span className="text-xs text-slate-500">-</span>;
                    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
                    return (
                        <div className="flex flex-wrap items-center gap-1">
                            <Chip size="sm" variant="flat">
                                {totalQty} items
                            </Chip>
                            {items.slice(0, 2).map((item, index) => (
                                <Chip key={`${item.product}-${index}`} size="sm" variant="flat">
                                    {item.product_name} x {item.quantity}
                                </Chip>
                            ))}
                            {items.length > 2 && (
                                <Chip size="sm" variant="flat">
                                    +{items.length - 2}
                                </Chip>
                            )}
                        </div>
                    );
                },
            },
            {
                id: "payment_methods",
                header: "Payments",
                cell: ({ row }) => {
                    const payments = row.original.payments ?? [];
                    if (!payments.length) return <span className="text-xs text-slate-500">-</span>;
                    return (
                        <div className="flex flex-wrap gap-1">
                            {payments.map((payment, index) => (
                                <Chip
                                    key={`${payment.method__name}-${index}`}
                                    size="sm"
                                    variant="flat"
                                >
                                    {payment.method__name}: {formatMoney(payment.amount)}
                                </Chip>
                            ))}
                        </div>
                    );
                },
            },
            {
                accessorKey: "total_amount",
                header: "Total",
                cell: ({ row }) => (
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatMoney(row.original.total_amount)}
                    </span>
                ),
            },
        ],
        []
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <ReceiptText className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold">Cashier Statement</h2>
                        {isFetching && <Spinner size="sm" />}
                    </div>
                    <p className="text-xs text-slate-500">{cashierDetailLine}</p>
                </ModalHeader>
                <ModalBody className="space-y-4">
                    {!cashierId ? (
                        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                            Select a cashier from Sales History first.
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <DatePicker
                                    hideTimeZone
                                    showMonthAndYearPickers
                                    granularity="minute"
                                    label="Start time"
                                    variant="bordered"
                                    value={range.start}
                                    onChange={(value) =>
                                        setRange((prev) => ({ ...prev, start: value }))
                                    }
                                />
                                <DatePicker
                                    hideTimeZone
                                    showMonthAndYearPickers
                                    granularity="minute"
                                    label="End time"
                                    variant="bordered"
                                    value={range.end}
                                    onChange={(value) =>
                                        setRange((prev) => ({ ...prev, end: value }))
                                    }
                                />
                            </div>

                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <Spinner size="lg" />
                                </div>
                            ) : isError || !data ? (
                                <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                                    Unable to load cashier statement for this filter range.
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                                            <p className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                                                <Wallet className="h-4 w-4" />
                                                Total Collected
                                            </p>
                                            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                                {formatMoney(data.summary.totalMoneyCollected)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                                            <p className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                                                <ReceiptText className="h-4 w-4" />
                                                Sales Count
                                            </p>
                                            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                                {data.summary.saleCount}
                                            </p>
                                        </div>
                                    </div>

                                    <Divider />

                                    <div>
                                        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            <CreditCard className="h-4 w-4" />
                                            Payment Method Breakdown
                                        </h3>
                                        {data.paymentMethodTotals.length === 0 ? (
                                            <p className="text-sm text-slate-500">
                                                No payments in this range.
                                            </p>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                {data.paymentMethodTotals.map((method) => (
                                                    <div
                                                        key={method.methodId}
                                                        className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                                                    >
                                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                            {method.methodName}
                                                        </p>
                                                        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                                            {formatMoney(method.amount)}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            Used in {method.saleCount} sale(s)
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <Divider />

                                    <div>
                                        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            <PackageSearch className="h-4 w-4" />
                                            Product Breakdown
                                        </h3>
                                        {data.productTotals.length === 0 ? (
                                            <p className="text-sm text-slate-500">
                                                No products sold in this range.
                                            </p>
                                        ) : (
                                            <div className="rounded-md border border-slate-200 dark:border-slate-800">
                                                <table className="w-full min-w-[420px] text-sm">
                                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-xs text-slate-500">
                                                                Product
                                                            </th>
                                                            <th className="px-3 py-2 text-right text-xs text-slate-500">
                                                                Qty Sold
                                                            </th>
                                                            <th className="px-3 py-2 text-right text-xs text-slate-500">
                                                                Amount
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                        {data.productTotals.map((product) => (
                                                            <tr key={product.productId}>
                                                                <td className="px-3 py-2">
                                                                    {product.productName}
                                                                </td>
                                                                <td className="px-3 py-2 text-right font-medium">
                                                                    {product.quantitySold}
                                                                </td>
                                                                <td className="px-3 py-2 text-right font-medium">
                                                                    {formatMoney(product.amount)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    <Divider />

                                    <div>
                                        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            <ReceiptText className="h-4 w-4" />
                                            All Sales ({data.sales.length})
                                        </h3>
                                        <DataTable
                                            columns={saleColumns}
                                            data={data.sales}
                                            getRowClassName={(sale) =>
                                                sale.receipt_issued
                                                    ? "border-l-4 border-yellow-400"
                                                    : undefined
                                            }
                                        />
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button variant="flat" onPress={onClose}>
                        Close
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
