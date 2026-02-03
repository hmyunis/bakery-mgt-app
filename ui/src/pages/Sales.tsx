import { useState, useMemo } from "react";
import { Tabs, Tab, Spinner, DatePicker, Select, SelectItem } from "@heroui/react";
import { ShoppingCart, History } from "lucide-react";
import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
import { PageTitle } from "../components/ui/PageTitle";
import { POSTerminal } from "../components/sales/POSTerminal";
import { SaleDetailModal } from "../components/sales/SaleDetailModal";
import { DeleteSaleModal } from "../components/sales/DeleteSaleModal";
import { DataTable } from "../components/ui/DataTable";
import { DataTablePagination } from "../components/ui/DataTablePagination";
import { getSalesHistoryColumns } from "../components/sales/SalesHistoryColumns";
import { useDeleteSale, useSales } from "../hooks/useSales";
import type { Sale } from "../types/sales";
import { useAppSelector } from "../store";

export function SalesPage() {
    const [activeTab, setActiveTab] = useState("pos");
    const [viewingSale, setViewingSale] = useState<Sale | null>(null);
    const [deletingSale, setDeletingSale] = useState<Sale | null>(null);
    const [receiptFilter, setReceiptFilter] = useState<"all" | "issued" | "not_issued">("all");

    // Sales History state
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPageSize, setHistoryPageSize] = useState(10);
    const [historyStartDate, setHistoryStartDate] = useState<DateValue>(today(getLocalTimeZone()));

    // Sales History data
    const { data: salesData, isLoading: isLoadingSales } = useSales({
        page: historyPage,
        page_size: historyPageSize,
        start_date: historyStartDate.toString(),
        receipt_issued:
            receiptFilter === "all" ? undefined : receiptFilter === "issued" ? true : false,
    });
    const { mutateAsync: deleteSale, isPending: isDeletingSale } = useDeleteSale();

    const { user } = useAppSelector((state) => state.auth);
    const isAdmin = user?.role === "admin";

    const salesRows = useMemo(() => salesData?.results ?? [], [salesData]);

    const handleViewSale = (sale: Sale) => {
        setViewingSale(sale);
    };

    const handleDeleteSaleRequest = (sale: Sale) => {
        setDeletingSale(sale);
    };

    const handleHistoryStartDateChange = (date: DateValue | null) => {
        if (date) {
            setHistoryStartDate(date);
            setHistoryPage(1); // Reset pagination when date filter changes
        }
    };

    const handleDeleteSaleConfirm = async () => {
        if (!deletingSale) return;
        await deleteSale(deletingSale.id);
        setDeletingSale(null);
        setViewingSale(null);
    };

    return (
        <div className="space-y-6 lg:space-y-8">
            <PageTitle
                title="Sales"
                subtitle="Process transactions, manage orders, and track daily revenue."
            />

            <Tabs
                aria-label="Sales"
                selectedKey={activeTab}
                onSelectionChange={(key) => setActiveTab(String(key))}
                color="primary"
                variant="underlined"
                classNames={{
                    tabList: "flex flex-wrap gap-2 sm:gap-3",
                    tab: "whitespace-nowrap",
                }}
            >
                <Tab
                    key="pos"
                    title={
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            <span>POS Terminal</span>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <POSTerminal />
                    </div>
                </Tab>

                <Tab
                    key="history"
                    title={
                        <div className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            <span>History</span>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
                            <DatePicker
                                label="Filter from Date"
                                variant="bordered"
                                showMonthAndYearPickers
                                value={historyStartDate}
                                onChange={handleHistoryStartDateChange}
                                className="w-full sm:w-48"
                            />
                            <Select
                                label="Receipt"
                                variant="bordered"
                                selectedKeys={new Set([receiptFilter])}
                                onSelectionChange={(keys) => {
                                    const key = Array.from(keys)[0] as
                                        | "all"
                                        | "issued"
                                        | "not_issued"
                                        | undefined;
                                    if (!key) return;
                                    setReceiptFilter(key);
                                    setHistoryPage(1);
                                }}
                                selectionMode="single"
                                classNames={{
                                    base: "!w-36 !text-left",
                                    trigger: "!w-36 !text-left",
                                    label: "!w-36 !text-left",
                                    value: "!text-slate-900 dark:!text-slate-100",
                                }}
                                aria-label="Filter by receipt issued"
                            >
                                <SelectItem key="all">All</SelectItem>
                                <SelectItem key="issued">Issued</SelectItem>
                                <SelectItem key="not_issued">Not issued</SelectItem>
                            </Select>
                        </div>
                        {isLoadingSales ? (
                            <div className="flex justify-center py-12">
                                <Spinner size="lg" />
                            </div>
                        ) : (
                            <>
                                <DataTable
                                    columns={getSalesHistoryColumns()}
                                    data={salesRows}
                                    onRowClick={handleViewSale}
                                    getRowClassName={(sale) =>
                                        sale.receipt_issued
                                            ? "border-l-4 border-yellow-400"
                                            : undefined
                                    }
                                />
                                {salesData && salesData.count > 0 && (
                                    <DataTablePagination
                                        pagination={{
                                            count: salesData.count,
                                            page: historyPage,
                                            pageSize: historyPageSize,
                                            totalPages: Math.ceil(
                                                salesData.count / historyPageSize
                                            ),
                                        }}
                                        onPageChange={(newPage) => setHistoryPage(newPage)}
                                        onPageSizeChange={(newSize) => {
                                            setHistoryPageSize(newSize);
                                            setHistoryPage(1);
                                        }}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </Tab>
            </Tabs>

            {/* Modals */}
            <SaleDetailModal
                isOpen={!!viewingSale}
                onClose={() => setViewingSale(null)}
                sale={viewingSale}
                canDelete={isAdmin}
                onDelete={handleDeleteSaleRequest}
            />

            <DeleteSaleModal
                isOpen={!!deletingSale}
                sale={deletingSale}
                isDeleting={isDeletingSale}
                onClose={() => setDeletingSale(null)}
                onConfirm={handleDeleteSaleConfirm}
            />
        </div>
    );
}
