import { useState, useMemo, useEffect } from "react";
import { Tabs, Tab, Button, Spinner, Input } from "@heroui/react";
import { Package, Utensils, Plus, Search, History, ChefHat } from "lucide-react";
import { PageTitle } from "../components/ui/PageTitle";
import { DataTable } from "../components/ui/DataTable";
import { DataTablePagination } from "../components/ui/DataTablePagination";
import { getProductColumns } from "../components/production/ProductColumns";
import { getRecipeColumns } from "../components/production/RecipeColumns";
import { getProductionHistoryColumns } from "../components/production/ProductionHistoryColumns";
import { ProductFormModal } from "../components/production/ProductFormModal";
import { DeleteProductModal } from "../components/production/DeleteProductModal";
import { RecipeBuilder } from "../components/production/RecipeBuilder";
import { DeleteRecipeModal } from "../components/production/DeleteRecipeModal";
import { RecipeDetailModal } from "../components/production/RecipeDetailModal";
import { ProductionRunFormModal } from "../components/production/ProductionRunFormModal";
import { DeleteProductionRunModal } from "../components/production/DeleteProductionRunModal";
import { ProductionRunDetailModal } from "../components/production/ProductionRunDetailModal";
import {
    useProducts,
    useRecipes,
    useRecipeByProduct,
    useProductsWithRecipes,
    useProductionRuns,
    useDeleteProductionRun,
} from "../hooks/useProduction";
import { useDebounce } from "../hooks/useDebounce";
import type { Product, Recipe, ProductionRun } from "../types/production";
import { useAppSelector } from "../store";
import { toast } from "sonner";

export function ProductionPage() {
    const [activeTab, setActiveTab] = useState("products");

    // Products state
    const [productSearch, setProductSearch] = useState("");
    const [productPage, setProductPage] = useState(1);
    const [productPageSize, setProductPageSize] = useState(10);
    const [isProductFormOpen, setIsProductFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

    // Recipe Builder state
    const [recipeSearch, setRecipeSearch] = useState("");
    const [recipePage, setRecipePage] = useState(1);
    const [recipePageSize, setRecipePageSize] = useState(10);
    const [isRecipeBuilderOpen, setIsRecipeBuilderOpen] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
    const [deletingRecipe, setDeletingRecipe] = useState<Recipe | null>(null);
    const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
    const [selectedProductForRecipe, setSelectedProductForRecipe] = useState<number | null>(null);

    // Production History state
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPageSize, setHistoryPageSize] = useState(10);
    const [isProductionRunFormOpen, setIsProductionRunFormOpen] = useState(false);
    const [selectedProductForProduction, setSelectedProductForProduction] =
        useState<Product | null>(null);
    const [deletingProductionRun, setDeletingProductionRun] = useState<ProductionRun | null>(null);
    const [viewingProductionRun, setViewingProductionRun] = useState<ProductionRun | null>(null);

    const { user } = useAppSelector((state) => state.auth);
    const isAdmin = user?.role === "admin";

    const debouncedProductSearch = useDebounce(productSearch, 500);
    const debouncedRecipeSearch = useDebounce(recipeSearch, 500);
    const { data: productsWithRecipesIds } = useProductsWithRecipes();

    // Ensure productsWithRecipesIds is always an array
    const productsWithRecipesArray = Array.isArray(productsWithRecipesIds)
        ? productsWithRecipesIds
        : [];

    // Products data
    const { data: productsData, isLoading: isLoadingProducts } = useProducts({
        page: productPage,
        page_size: productPageSize,
        search: debouncedProductSearch || undefined,
    });

    // Fetch all products for product name mapping (used in recipes table)
    const { data: allProductsData } = useProducts({ page_size: 100 });

    // Recipes data
    const { data: recipesData, isLoading: isLoadingRecipes } = useRecipes({
        page: recipePage,
        page_size: recipePageSize,
        search: debouncedRecipeSearch || undefined,
    });

    // Recipe data for selected product
    const { data: recipeData } = useRecipeByProduct(selectedProductForRecipe);

    // Production History data
    const { data: historyData, isLoading: isLoadingHistory } = useProductionRuns({
        page: historyPage,
        page_size: historyPageSize,
        ordering: "-date_produced",
    });

    const { mutateAsync: deleteProductionRun, isPending: isDeletingProductionRun } =
        useDeleteProductionRun();

    const productRows = useMemo(() => {
        const rows = productsData?.results ?? [];
        // Add hasRecipe flag to each product
        return rows.map((product) => ({
            ...product,
            hasRecipe: productsWithRecipesArray.includes(product.id),
        }));
    }, [productsData, productsWithRecipesArray]);
    const recipeRows = useMemo(() => recipesData?.results ?? [], [recipesData]);
    const historyRows = useMemo(() => historyData?.results ?? [], [historyData]);

    // Production Run handlers
    const handleViewProductionRun = (productionRun: ProductionRun) => {
        setViewingProductionRun(productionRun);
    };

    const handleDeleteProductionRun = (productionRun: ProductionRun) => {
        setViewingProductionRun(null); // Close detail modal
        setDeletingProductionRun(productionRun);
    };

    const handleDeleteProductionRunConfirm = async () => {
        if (!deletingProductionRun) return;
        await deleteProductionRun(deletingProductionRun.id);
        setDeletingProductionRun(null);
    };

    // Create a map of product IDs to names for display
    const productMap = useMemo(() => {
        const map = new Map<number, string>();
        allProductsData?.results.forEach((product) => {
            map.set(product.id, product.name);
        });
        return map;
    }, [allProductsData]);

    // Product handlers
    const handleAddProduct = () => {
        setEditingProduct(null);
        setIsProductFormOpen(true);
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setIsProductFormOpen(true);
    };

    const handleDeleteProduct = (product: Product) => {
        setDeletingProduct(product);
    };

    // Recipe handlers
    const handleEditRecipe = (recipe: Recipe) => {
        setEditingRecipe(recipe);
        if (recipe.product) {
            setSelectedProductForRecipe(recipe.product);
        }
        setIsRecipeBuilderOpen(true);
    };

    const handleDeleteRecipe = (recipe: Recipe) => {
        setDeletingRecipe(recipe);
    };

    const handleViewRecipe = (recipe: Recipe) => {
        setViewingRecipe(recipe);
    };

    // Recipe Builder handlers
    const handleOpenRecipeBuilder = async (product?: Product) => {
        // Check if product already has a recipe
        if (product && productsWithRecipesArray.includes(product.id)) {
            // Product already has a recipe, open in edit mode
            setSelectedProductForRecipe(product.id);
            setIsRecipeBuilderOpen(true);
            return;
        }

        // Check if all products have recipes
        const allProductsList = allProductsData?.results ?? [];
        if (
            allProductsList.length > 0 &&
            productsWithRecipesArray.length >= allProductsList.length
        ) {
            // All products have recipes, show message
            toast.error("All products already have recipes. Edit an existing recipe instead.");
            return;
        }

        if (product) {
            setSelectedProductForRecipe(product.id);
        } else {
            setSelectedProductForRecipe(null);
            setEditingRecipe(null);
        }
        setIsRecipeBuilderOpen(true);
    };

    const handleCloseRecipeBuilder = () => {
        setIsRecipeBuilderOpen(false);
        setEditingRecipe(null);
        setSelectedProductForRecipe(null);
    };

    // Reset recipe page when search changes
    useEffect(() => {
        setRecipePage(1);
    }, [debouncedRecipeSearch]);

    // Update recipe when recipeData changes
    useEffect(() => {
        if (selectedProductForRecipe && isRecipeBuilderOpen) {
            if (recipeData) {
                setEditingRecipe(recipeData);
            } else {
                setEditingRecipe(null);
            }
        }
    }, [recipeData, selectedProductForRecipe, isRecipeBuilderOpen]);

    return (
        <div className="space-y-6 lg:space-y-8">
            <PageTitle
                title="Production"
                subtitle="Manage production orders, recipes, and track baking schedules."
            />

            <Tabs
                aria-label="Production"
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
                    key="products"
                    title={
                        <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span>Products</span>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div
                                className={`
                                    w-full sm:w-64 lg:w-72 
                                    focus-within:sm:w-96 
                                    transition-[width] duration-300 ease-in-out
                                `}
                            >
                                <Input
                                    placeholder="Search products by name..."
                                    startContent={<Search className="h-4 w-4 text-zinc-400" />}
                                    value={productSearch}
                                    onValueChange={setProductSearch}
                                    isClearable
                                    classNames={{
                                        input: "!text-zinc-900 dark:!text-zinc-100",
                                        inputWrapper:
                                            "!placeholder:text-zinc-400 dark:!placeholder:text-zinc-500",
                                    }}
                                />
                            </div>
                            {isAdmin && (
                                <Button
                                    color="primary"
                                    startContent={<Plus className="h-4 w-4" />}
                                    onPress={handleAddProduct}
                                >
                                    Add Product
                                </Button>
                            )}
                        </div>

                        {isLoadingProducts ? (
                            <div className="flex justify-center py-12">
                                <Spinner size="lg" />
                            </div>
                        ) : (
                            <>
                                <DataTable
                                    columns={getProductColumns({
                                        onEdit: isAdmin ? handleEditProduct : undefined,
                                        onDelete: isAdmin ? handleDeleteProduct : undefined,
                                        onBuildRecipe: isAdmin
                                            ? handleOpenRecipeBuilder
                                            : undefined,
                                        onRecordProduction: (product) => {
                                            setSelectedProductForProduction(product);
                                            setIsProductionRunFormOpen(true);
                                        },
                                    })}
                                    data={productRows}
                                />
                                {productsData && productsData.count > 0 && (
                                    <DataTablePagination
                                        pagination={{
                                            count: productsData.count,
                                            page: productPage,
                                            pageSize: productPageSize,
                                            totalPages: Math.ceil(
                                                productsData.count / productPageSize
                                            ),
                                        }}
                                        onPageChange={(newPage) => setProductPage(newPage)}
                                        onPageSizeChange={(newSize) => {
                                            setProductPageSize(newSize);
                                            setProductPage(1);
                                        }}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </Tab>

                <Tab
                    key="recipes"
                    title={
                        <div className="flex items-center gap-2">
                            <Utensils className="h-4 w-4" />
                            <span>Recipe Builder</span>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div
                                className={`
                                    w-full sm:w-64 lg:w-72 
                                    focus-within:sm:w-96 
                                    transition-[width] duration-300 ease-in-out
                                `}
                            >
                                <Input
                                    placeholder="Search by product name or instructions..."
                                    startContent={<Search className="h-4 w-4 text-zinc-400" />}
                                    value={recipeSearch}
                                    onValueChange={setRecipeSearch}
                                    isClearable
                                    classNames={{
                                        input: "!text-zinc-900 dark:!text-zinc-100",
                                        inputWrapper:
                                            "!placeholder:text-zinc-400 dark:!placeholder:text-zinc-500",
                                    }}
                                />
                            </div>
                            <Button
                                color="primary"
                                startContent={<Plus className="h-4 w-4" />}
                                onPress={() => handleOpenRecipeBuilder()}
                            >
                                Create Recipe
                            </Button>
                        </div>

                        {isLoadingRecipes ? (
                            <div className="flex justify-center py-12">
                                <Spinner size="lg" />
                            </div>
                        ) : (
                            <>
                                <DataTable
                                    columns={getRecipeColumns({
                                        onEdit: isAdmin ? handleEditRecipe : undefined,
                                        onDelete: isAdmin ? handleDeleteRecipe : undefined,
                                    })}
                                    data={recipeRows.map((recipe) => ({
                                        ...recipe,
                                        productName: recipe.product
                                            ? productMap.get(recipe.product) ||
                                              `Product #${recipe.product}`
                                            : "N/A",
                                    }))}
                                    onRowClick={handleViewRecipe}
                                />
                                {recipesData && recipesData.count > 0 && (
                                    <DataTablePagination
                                        pagination={{
                                            count: recipesData.count,
                                            page: recipePage,
                                            pageSize: recipePageSize,
                                            totalPages: Math.ceil(
                                                recipesData.count / recipePageSize
                                            ),
                                        }}
                                        onPageChange={(newPage) => setRecipePage(newPage)}
                                        onPageSizeChange={(newSize) => {
                                            setRecipePageSize(newSize);
                                            setRecipePage(1);
                                        }}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </Tab>

                <Tab
                    key="history"
                    title={
                        <div className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            <span>Production History</span>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button
                                color="primary"
                                onPress={() => {
                                    setSelectedProductForProduction(null);
                                    setIsProductionRunFormOpen(true);
                                }}
                                startContent={<ChefHat className="h-4 w-4" />}
                            >
                                Record Baking Session
                            </Button>
                        </div>
                        {isLoadingHistory ? (
                            <div className="flex justify-center py-12">
                                <Spinner size="lg" />
                            </div>
                        ) : (
                            <>
                                <DataTable
                                    columns={getProductionHistoryColumns()}
                                    data={historyRows}
                                    onRowClick={handleViewProductionRun}
                                />
                                {historyData && historyData.count > 0 && (
                                    <DataTablePagination
                                        pagination={{
                                            count: historyData.count,
                                            page: historyPage,
                                            pageSize: historyPageSize,
                                            totalPages: Math.ceil(
                                                historyData.count / historyPageSize
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

            <ProductFormModal
                isOpen={isProductFormOpen}
                onClose={() => {
                    setIsProductFormOpen(false);
                    setEditingProduct(null);
                }}
                product={editingProduct}
            />

            <DeleteProductModal
                isOpen={!!deletingProduct}
                onClose={() => setDeletingProduct(null)}
                product={deletingProduct}
            />

            <RecipeBuilder
                isOpen={isRecipeBuilderOpen}
                onClose={handleCloseRecipeBuilder}
                recipe={editingRecipe}
                preselectedProductId={selectedProductForRecipe}
            />

            <DeleteRecipeModal
                isOpen={!!deletingRecipe}
                onClose={() => setDeletingRecipe(null)}
                recipe={deletingRecipe}
            />

            <RecipeDetailModal
                isOpen={!!viewingRecipe}
                onClose={() => setViewingRecipe(null)}
                recipe={viewingRecipe}
                onEdit={isAdmin ? handleEditRecipe : undefined}
            />

            <ProductionRunFormModal
                isOpen={isProductionRunFormOpen}
                onClose={() => {
                    setIsProductionRunFormOpen(false);
                    setSelectedProductForProduction(null);
                }}
                preselectedProduct={selectedProductForProduction}
            />

            <DeleteProductionRunModal
                isOpen={!!deletingProductionRun}
                onClose={() => setDeletingProductionRun(null)}
                onConfirm={handleDeleteProductionRunConfirm}
                productionRun={deletingProductionRun}
                isLoading={isDeletingProductionRun}
            />

            <ProductionRunDetailModal
                isOpen={!!viewingProductionRun}
                onClose={() => setViewingProductionRun(null)}
                productionRun={viewingProductionRun}
                onDelete={isAdmin ? handleDeleteProductionRun : undefined}
                isDeleting={isDeletingProductionRun}
            />
        </div>
    );
}
