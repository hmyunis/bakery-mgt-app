import { useState, useMemo } from "react";
import { Tabs, Tab, Spinner } from "@heroui/react";
import { ShoppingCart, History } from "lucide-react";
import { PageTitle } from "../components/ui/PageTitle";
import { POSTerminal } from "../components/sales/POSTerminal";
import { CheckoutModal } from "../components/sales/CheckoutModal";
import { SaleDetailModal } from "../components/sales/SaleDetailModal";
import { DeleteSaleModal } from "../components/sales/DeleteSaleModal";
import { DataTable } from "../components/ui/DataTable";
import { DataTablePagination } from "../components/ui/DataTablePagination";
import { getSalesHistoryColumns } from "../components/sales/SalesHistoryColumns";
import { useDeleteSale, useSales } from "../hooks/useSales";
import type { Sale } from "../types/sales";
import type { Product } from "../types/production";
import { useAppSelector } from "../store";

interface CartItem {
    product: Product;
    quantity: number;
}

export function SalesPage() {
    const [activeTab, setActiveTab] = useState("pos");
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [checkoutCart, setCheckoutCart] = useState<CartItem[]>([]);
    const [viewingSale, setViewingSale] = useState<Sale | null>(null);
    const [deletingSale, setDeletingSale] = useState<Sale | null>(null);

    // Sales History state
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPageSize, setHistoryPageSize] = useState(10);

    // Sales History data
    const { data: salesData, isLoading: isLoadingSales } = useSales({
        page: historyPage,
        page_size: historyPageSize,
    });
    const { mutateAsync: deleteSale, isPending: isDeletingSale } = useDeleteSale();

    const { user } = useAppSelector((state) => state.auth);
    const isAdmin = user?.role === "admin";

    const salesRows = useMemo(() => salesData?.results ?? [], [salesData]);

    const handleCheckout = (items: CartItem[]) => {
        setCheckoutCart(items);
        setIsCheckoutOpen(true);
    };

    const handleCheckoutSuccess = () => {
        setCheckoutCart([]);
        // Optionally switch to history tab to see the new sale
    };

    const handleViewSale = (sale: Sale) => {
        setViewingSale(sale);
    };

    const handleDeleteSaleRequest = (sale: Sale) => {
        setDeletingSale(sale);
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
                        <POSTerminal onCheckout={handleCheckout} />
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
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => {
                    setIsCheckoutOpen(false);
                    setCheckoutCart([]);
                }}
                cartItems={checkoutCart}
                onSuccess={handleCheckoutSuccess}
            />

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
