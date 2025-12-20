import { useState, useMemo } from "react";
import { Button, Tabs, Tab, DatePicker } from "@heroui/react";
import { Plus, Package, ShoppingCart, ListChecks, RotateCcw } from "lucide-react";
import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
import { PageTitle } from "../components/ui/PageTitle";
import { IngredientFilterCard } from "../components/inventory/IngredientFilterCard";
import { DataTable } from "../components/ui/DataTable";
import { DataTablePagination } from "../components/ui/DataTablePagination";
import { IngredientFormModal } from "../components/inventory/IngredientFormModal";
import { DeleteIngredientModal } from "../components/inventory/DeleteIngredientModal";
import { PurchaseFormModal } from "../components/inventory/PurchaseFormModal";
import { DeletePurchaseModal } from "../components/inventory/DeletePurchaseModal";
import { ShoppingList } from "../components/inventory/ShoppingList";
import { StockAdjustmentFormModal } from "../components/inventory/StockAdjustmentFormModal";
import { DeleteStockAdjustmentModal } from "../components/inventory/DeleteStockAdjustmentModal";
import { getIngredientColumns } from "../components/inventory/IngredientColumns";
import { getPurchaseColumns } from "../components/inventory/PurchaseColumns";
import { getStockAdjustmentColumns } from "../components/inventory/StockAdjustmentColumns";
import {
    useIngredients,
    useDeleteIngredient,
    usePurchases,
    useDeletePurchase,
    useStockAdjustments,
    useDeleteStockAdjustment,
} from "../hooks/useInventory";
import { useDebounce } from "../hooks/useDebounce";
import type { Ingredient, Purchase, StockAdjustment } from "../types/inventory";

export function InventoryPage() {
    const [activeTab, setActiveTab] = useState("ingredients");

    // Ingredients state
    const [ingredientSearch, setIngredientSearch] = useState("");
    const [ingredientPage, setIngredientPage] = useState(1);
    const [ingredientPageSize, setIngredientPageSize] = useState(10);
    const [isIngredientFormOpen, setIsIngredientFormOpen] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [deletingIngredient, setDeletingIngredient] = useState<Ingredient | null>(null);

    // Purchases state
    const [purchasePage, setPurchasePage] = useState(1);
    const [purchasePageSize, setPurchasePageSize] = useState(10);
    const [purchaseStartDate, setPurchaseStartDate] = useState<DateValue | null>(today("UTC"));
    const [isPurchaseFormOpen, setIsPurchaseFormOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
    const [deletingPurchase, setDeletingPurchase] = useState<Purchase | null>(null);
    const [purchaseIngredient, setPurchaseIngredient] = useState<Ingredient | null>(null);

    // Stock Adjustments state
    const [adjustmentPage, setAdjustmentPage] = useState(1);
    const [adjustmentPageSize, setAdjustmentPageSize] = useState(10);
    const [adjustmentStartDate, setAdjustmentStartDate] = useState<DateValue>(
        today(getLocalTimeZone())
    );
    const [isAdjustmentFormOpen, setIsAdjustmentFormOpen] = useState(false);
    const [deletingAdjustment, setDeletingAdjustment] = useState<StockAdjustment | null>(null);
    const [adjustmentIngredient, setAdjustmentIngredient] = useState<Ingredient | null>(null);

    const debouncedIngredientSearch = useDebounce(ingredientSearch, 500);

    // Ingredients data
    const { data: ingredientsData, isLoading: isLoadingIngredients } = useIngredients({
        page: ingredientPage,
        page_size: ingredientPageSize,
        search: debouncedIngredientSearch || undefined,
    });

    // Purchases data
    const { data: purchasesData, isLoading: isLoadingPurchases } = usePurchases({
        page: purchasePage,
        page_size: purchasePageSize,
        start_date: purchaseStartDate?.toString() || undefined,
    });

    // Stock Adjustments data
    const { data: adjustmentsData, isLoading: isLoadingAdjustments } = useStockAdjustments({
        page: adjustmentPage,
        page_size: adjustmentPageSize,
        start_date: adjustmentStartDate.toString(),
    });

    const { mutateAsync: deleteIngredient, isPending: isDeletingIngredient } =
        useDeleteIngredient();
    const { mutateAsync: deletePurchase, isPending: isDeletingPurchase } = useDeletePurchase();
    const { mutateAsync: deleteAdjustment, isPending: isDeletingAdjustment } =
        useDeleteStockAdjustment();

    const ingredientRows = useMemo(() => ingredientsData?.results ?? [], [ingredientsData]);
    const purchaseRows = useMemo(() => purchasesData?.results ?? [], [purchasesData]);
    const adjustmentRows = useMemo(() => adjustmentsData?.results ?? [], [adjustmentsData]);

    // Ingredient handlers
    const handleAddIngredient = () => {
        setEditingIngredient(null);
        setIsIngredientFormOpen(true);
    };

    const handleEditIngredient = (ingredient: Ingredient) => {
        setEditingIngredient(ingredient);
        setIsIngredientFormOpen(true);
    };

    const handleDeleteIngredient = (ingredient: Ingredient) => {
        setDeletingIngredient(ingredient);
    };

    const handleDeleteIngredientConfirm = async () => {
        if (!deletingIngredient) return;
        await deleteIngredient(deletingIngredient.id);
        setDeletingIngredient(null);
    };

    // Purchase handlers
    const handleAddPurchase = (ingredient?: Ingredient) => {
        setEditingPurchase(null);
        setPurchaseIngredient(ingredient || null);
        setIsPurchaseFormOpen(true);
    };

    const handleEditPurchase = (purchase: Purchase) => {
        setEditingPurchase(purchase);
        setPurchaseIngredient(null);
        setIsPurchaseFormOpen(true);
    };

    const handleDeletePurchase = (purchase: Purchase) => {
        setDeletingPurchase(purchase);
    };

    const handleDeletePurchaseConfirm = async () => {
        if (!deletingPurchase) return;
        await deletePurchase(deletingPurchase.id);
        setDeletingPurchase(null);
    };

    const handlePurchaseStartDateChange = (date: DateValue | null) => {
        setPurchaseStartDate(date);
        setPurchasePage(1); // Reset pagination when date filter changes
    };

    // Stock Adjustment handlers
    const handleAddAdjustment = (ingredient?: Ingredient) => {
        setAdjustmentIngredient(ingredient || null);
        setIsAdjustmentFormOpen(true);
    };

    const handleAdjustmentStartDateChange = (date: DateValue | null) => {
        if (date) {
            setAdjustmentStartDate(date);
            setAdjustmentPage(1); // Reset pagination when date filter changes
        }
    };

    const handleDeleteAdjustment = (adjustment: StockAdjustment) => {
        setDeletingAdjustment(adjustment);
    };

    const handleDeleteAdjustmentConfirm = async () => {
        if (!deletingAdjustment) return;
        await deleteAdjustment(deletingAdjustment.id);
        setDeletingAdjustment(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <PageTitle
                    title="Inventory"
                    subtitle="Manage ingredients, track stock levels, and monitor purchases"
                />
            </div>

            <Tabs
                selectedKey={activeTab}
                onSelectionChange={(key) => setActiveTab(key as string)}
                aria-label="Inventory tabs"
                color="primary"
                variant="underlined"
                classNames={{
                    tabList:
                        "flex flex-wrap gap-4 sm:gap-6 w-full relative rounded-none p-0 border-b border-divider",
                    cursor: "w-full bg-primary",
                    tab: "max-w-fit px-0 h-12 whitespace-nowrap",
                    tabContent: "group-data-[selected=true]:text-primary",
                }}
            >
                <Tab
                    key="ingredients"
                    title={
                        <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span>Ingredients</span>
                        </div>
                    }
                >
                    <div className="pt-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <IngredientFilterCard
                                searchQuery={ingredientSearch}
                                onSearchChange={setIngredientSearch}
                                isLoading={isLoadingIngredients}
                            />
                            <Button
                                color="primary"
                                onPress={handleAddIngredient}
                                startContent={<Plus className="h-4 w-4" />}
                            >
                                Add Ingredient
                            </Button>
                        </div>

                        <DataTable
                            columns={getIngredientColumns({
                                onEdit: handleEditIngredient,
                                onDelete: handleDeleteIngredient,
                                onAddPurchase: handleAddPurchase,
                                onAdjustStock: handleAddAdjustment,
                            })}
                            data={ingredientRows}
                            isLoading={isLoadingIngredients}
                        />

                        {ingredientsData && ingredientsData.count > 0 && (
                            <DataTablePagination
                                pagination={{
                                    count: ingredientsData.count,
                                    page: ingredientPage,
                                    pageSize: ingredientPageSize,
                                    totalPages: Math.ceil(
                                        ingredientsData.count / ingredientPageSize
                                    ),
                                }}
                                onPageChange={(newPage) => setIngredientPage(newPage)}
                                onPageSizeChange={(newSize) => {
                                    setIngredientPageSize(newSize);
                                    setIngredientPage(1);
                                }}
                            />
                        )}
                    </div>
                </Tab>

                <Tab
                    key="purchases"
                    title={
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            <span>Purchase History</span>
                        </div>
                    }
                >
                    <div className="pt-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <DatePicker
                                    label="Filter from Date"
                                    variant="bordered"
                                    showMonthAndYearPickers
                                    value={purchaseStartDate}
                                    onChange={handlePurchaseStartDateChange}
                                    className="w-full sm:w-48"
                                />
                            </div>
                            <Button
                                color="primary"
                                onPress={() => handleAddPurchase()}
                                startContent={<Plus className="h-4 w-4" />}
                            >
                                Record Purchase
                            </Button>
                        </div>

                        <DataTable
                            columns={getPurchaseColumns({
                                onEdit: handleEditPurchase,
                                onDelete: handleDeletePurchase,
                            })}
                            data={purchaseRows}
                            isLoading={isLoadingPurchases}
                        />

                        {purchasesData && purchasesData.count > 0 && (
                            <DataTablePagination
                                pagination={{
                                    count: purchasesData.count,
                                    page: purchasePage,
                                    pageSize: purchasePageSize,
                                    totalPages: Math.ceil(purchasesData.count / purchasePageSize),
                                }}
                                onPageChange={(newPage) => setPurchasePage(newPage)}
                                onPageSizeChange={(newSize) => {
                                    setPurchasePageSize(newSize);
                                    setPurchasePage(1);
                                }}
                            />
                        )}
                    </div>
                </Tab>

                <Tab
                    key="shopping-list"
                    title={
                        <div className="flex items-center gap-2">
                            <ListChecks className="h-4 w-4" />
                            <span>Shopping List</span>
                        </div>
                    }
                >
                    <div className="pt-4">
                        <ShoppingList />
                    </div>
                </Tab>

                <Tab
                    key="adjustments"
                    title={
                        <div className="flex items-center gap-2">
                            <RotateCcw className="h-4 w-4" />
                            <span>Stock Adjustments</span>
                        </div>
                    }
                >
                    <div className="pt-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <DatePicker
                                    label="Filter from Date"
                                    variant="bordered"
                                    showMonthAndYearPickers
                                    value={adjustmentStartDate}
                                    onChange={handleAdjustmentStartDateChange}
                                    className="w-full sm:w-48"
                                />
                            </div>
                            <Button
                                color="primary"
                                onPress={() => handleAddAdjustment()}
                                startContent={<Plus className="h-4 w-4" />}
                            >
                                Record Adjustment
                            </Button>
                        </div>

                        <DataTable
                            columns={getStockAdjustmentColumns({
                                onDelete: handleDeleteAdjustment,
                            })}
                            data={adjustmentRows}
                            isLoading={isLoadingAdjustments}
                        />

                        {adjustmentsData && adjustmentsData.count > 0 && (
                            <DataTablePagination
                                pagination={{
                                    count: adjustmentsData.count,
                                    page: adjustmentPage,
                                    pageSize: adjustmentPageSize,
                                    totalPages: Math.ceil(
                                        adjustmentsData.count / adjustmentPageSize
                                    ),
                                }}
                                onPageChange={(newPage) => setAdjustmentPage(newPage)}
                                onPageSizeChange={(newSize) => {
                                    setAdjustmentPageSize(newSize);
                                    setAdjustmentPage(1);
                                }}
                            />
                        )}
                    </div>
                </Tab>
            </Tabs>

            {/* Ingredient Modals */}
            <IngredientFormModal
                isOpen={isIngredientFormOpen}
                onClose={() => {
                    setIsIngredientFormOpen(false);
                    setEditingIngredient(null);
                }}
                ingredient={editingIngredient}
            />

            <DeleteIngredientModal
                isOpen={!!deletingIngredient}
                onClose={() => setDeletingIngredient(null)}
                onConfirm={handleDeleteIngredientConfirm}
                ingredient={deletingIngredient}
                isLoading={isDeletingIngredient}
            />

            {/* Purchase Modals */}
            <PurchaseFormModal
                isOpen={isPurchaseFormOpen}
                onClose={() => {
                    setIsPurchaseFormOpen(false);
                    setEditingPurchase(null);
                    setPurchaseIngredient(null);
                }}
                purchase={editingPurchase}
                preselectedIngredient={purchaseIngredient}
            />

            <DeletePurchaseModal
                isOpen={!!deletingPurchase}
                onClose={() => setDeletingPurchase(null)}
                onConfirm={handleDeletePurchaseConfirm}
                purchase={deletingPurchase}
                isLoading={isDeletingPurchase}
            />

            {/* Stock Adjustment Modals */}
            <StockAdjustmentFormModal
                isOpen={isAdjustmentFormOpen}
                onClose={() => {
                    setIsAdjustmentFormOpen(false);
                    setAdjustmentIngredient(null);
                }}
                preselectedIngredient={adjustmentIngredient}
            />

            <DeleteStockAdjustmentModal
                isOpen={!!deletingAdjustment}
                onClose={() => setDeletingAdjustment(null)}
                onConfirm={handleDeleteAdjustmentConfirm}
                adjustment={deletingAdjustment}
                isLoading={isDeletingAdjustment}
            />
        </div>
    );
}
