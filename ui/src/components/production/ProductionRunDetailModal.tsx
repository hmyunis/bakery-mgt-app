import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Chip,
    Divider,
    Alert,
} from "@heroui/react";
import { ChefHat, Package, Calendar, User, AlertTriangle, FileText } from "lucide-react";
import type { ProductionRun } from "../../types/production";
import { useIngredients } from "../../hooks/useInventory";
import { useRecipeByProduct } from "../../hooks/useProduction";

interface ProductionRunDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    productionRun: ProductionRun | null;
    onDelete?: (productionRun: ProductionRun) => void;
    isDeleting?: boolean;
}

export function ProductionRunDetailModal({
    isOpen,
    onClose,
    productionRun,
    onDelete,
    isDeleting = false,
}: ProductionRunDetailModalProps) {
    const { data: ingredientsData } = useIngredients({ page_size: 100 });
    const ingredients = ingredientsData?.results || [];

    // Fetch recipe to get standard_yield for wastage calculation
    const { data: recipeData } = useRecipeByProduct(
        productionRun?.product || null
    );

    // Create ingredient map for unit lookup
    const ingredientMap = new Map(
        ingredients.map((ing) => [ing.name.toLowerCase(), ing])
    );

    if (!productionRun) return null;

    const productName = productionRun.product_name || productionRun.composite_name || "Unknown";
    const recipe = recipeData;
    const quantityProduced = productionRun.quantity_produced;
    const standardYield = recipe?.standard_yield || 1;

    // Calculate wastage in terms of product pieces
    // For each ingredient: (wastage / theoretical_amount) * quantity_produced = pieces affected
    const calculateProductWastage = (): { pieces: number; isWaste: boolean } => {
        if (!productionRun.usages || productionRun.usages.length === 0) {
            return { pieces: 0, isWaste: false };
        }

        const wastePercentages: number[] = [];
        const savingsPercentages: number[] = [];

        productionRun.usages.forEach((usage) => {
            const theoretical = parseFloat(usage.theoretical_amount.toString());
            const wastage = parseFloat(usage.wastage.toString());

            if (theoretical > 0) {
                const percentage = (wastage / theoretical) * 100;
                if (percentage > 0) {
                    wastePercentages.push(percentage);
                } else if (percentage < 0) {
                    savingsPercentages.push(Math.abs(percentage));
                }
            }
        });

        // For waste: take the maximum (most limiting ingredient)
        // For savings: take the minimum (most limiting ingredient)
        if (wastePercentages.length > 0) {
            const maxWastePercentage = Math.max(...wastePercentages);
            const piecesWasted = (maxWastePercentage / 100) * quantityProduced;
            return { pieces: piecesWasted, isWaste: true };
        } else if (savingsPercentages.length > 0) {
            const minSavingsPercentage = Math.min(...savingsPercentages);
            const extraPiecesPossible = (minSavingsPercentage / 100) * quantityProduced;
            return { pieces: extraPiecesPossible, isWaste: false };
        }

        return { pieces: 0, isWaste: false };
    };

    const productWastage = calculateProductWastage();

    // Helper to get unit for an ingredient
    const getIngredientUnit = (ingredientName: string): string => {
        const usage = productionRun.usages.find(
            (u) => u.ingredient__name.toLowerCase() === ingredientName.toLowerCase()
        );
        if (usage?.ingredient__unit) {
            return usage.ingredient__unit;
        }
        const ingredient = ingredientMap.get(ingredientName.toLowerCase());
        return ingredient?.unit || "";
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <ChefHat className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                Production Run Details
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {productName}
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
                                    <Package className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        Product
                                    </p>
                                </div>
                                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    {productName}
                                </p>
                            </div>

                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <ChefHat className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        Quantity Produced
                                    </p>
                                </div>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {productionRun.quantity_produced.toFixed(2)}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                    pieces
                                </p>
                            </div>

                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        Date Produced
                                    </p>
                                </div>
                                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    {new Date(productionRun.date_produced).toLocaleString()}
                                </p>
                            </div>

                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        Chef
                                    </p>
                                </div>
                                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    {productionRun.chef_name || "-"}
                                </p>
                            </div>
                        </div>

                        {/* Wastage Alert */}
                        {productWastage.pieces > 0 && (
                            <Alert
                                color={productWastage.isWaste ? "danger" : "success"}
                                variant="flat"
                                title={productWastage.isWaste ? "Wastage Detected" : "Potential Savings"}
                                startContent={<AlertTriangle className="h-5 w-5" />}
                            >
                                <p className="text-sm">
                                    {productWastage.isWaste ? (
                                        <>
                                            Approximately{" "}
                                            <span className="font-semibold">
                                                {productWastage.pieces.toFixed(2)} pieces
                                            </span>{" "}
                                            worth of product was wasted due to ingredient overuse.
                                        </>
                                    ) : (
                                        <>
                                            Could have made approximately{" "}
                                            <span className="font-semibold">
                                                {productWastage.pieces.toFixed(2)} extra pieces
                                            </span>{" "}
                                            with the ingredient savings achieved.
                                        </>
                                    )}
                                </p>
                            </Alert>
                        )}

                        {/* Ingredient Usage Details */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <ChefHat className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                    Ingredient Usage
                                </p>
                            </div>
                            <div className="space-y-3">
                                {productionRun.usages && productionRun.usages.length > 0 ? (
                                    productionRun.usages.map((usage, index) => {
                                        const unit = getIngredientUnit(usage.ingredient__name);
                                        const wastage = parseFloat(usage.wastage.toString());
                                        const hasWastage = wastage > 0;
                                        const hasSavings = wastage < 0;

                                        return (
                                            <div
                                                key={index}
                                                className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-3"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                        {usage.ingredient__name}
                                                    </h4>
                                                    {unit && (
                                                        <Chip variant="flat" size="sm">
                                                            {unit}
                                                        </Chip>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                                                            Theoretical Amount
                                                        </p>
                                                        <p className="text-lg font-semibold text-zinc-600 dark:text-zinc-400">
                                                            {parseFloat(
                                                                usage.theoretical_amount.toString()
                                                            ).toFixed(3)}{" "}
                                                            {unit}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                                                            Actual Amount
                                                        </p>
                                                        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                                            {parseFloat(
                                                                usage.actual_amount.toString()
                                                            ).toFixed(3)}{" "}
                                                            {unit}
                                                        </p>
                                                    </div>
                                                </div>

                                                <Divider />

                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                                        Wastage
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        {hasWastage && (
                                                            <AlertTriangle className="h-4 w-4 text-danger-500" />
                                                        )}
                                                        <span
                                                            className={
                                                                hasWastage
                                                                    ? "text-danger-600 dark:text-danger-400 font-semibold"
                                                                    : hasSavings
                                                                    ? "text-success-600 dark:text-success-400 font-semibold"
                                                                    : "text-zinc-600 dark:text-zinc-400 font-semibold"
                                                            }
                                                        >
                                                            {hasWastage ? "+" : ""}
                                                            {wastage.toFixed(3)} {unit}
                                                        </span>
                                                        {hasWastage && (
                                                            <Chip color="danger" variant="flat" size="sm">
                                                                Waste
                                                            </Chip>
                                                        )}
                                                        {hasSavings && (
                                                            <Chip color="success" variant="flat" size="sm">
                                                                Saved
                                                            </Chip>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                                        <p className="text-zinc-500 dark:text-zinc-400">
                                            No usage data available.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        {productionRun.notes && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        Notes
                                    </p>
                                </div>
                                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
                                    <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
                                        {productionRun.notes}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="flat"
                        onPress={onClose}
                        isDisabled={isDeleting}
                        className="!text-zinc-700 dark:!text-zinc-300"
                    >
                        Cancel
                    </Button>
                    {onDelete && (
                        <Button
                            color="danger"
                            onPress={() => onDelete(productionRun)}
                            isLoading={isDeleting}
                            isDisabled={isDeleting}
                            startContent={<AlertTriangle className="h-4 w-4" />}
                        >
                            Delete Production Run
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

