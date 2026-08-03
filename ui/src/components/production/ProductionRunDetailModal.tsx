import {
    Alert,
    Button,
    Chip,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@heroui/react";
import { AlertTriangle, Calendar, ChefHat, Gauge, Package, User } from "lucide-react";
import type { ProductionRun } from "../../types/production";

interface ProductionRunDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    productionRun: ProductionRun | null;
    onDelete?: (productionRun: ProductionRun) => void;
    isDeleting?: boolean;
}

const labels = {
    baseline: "Building the working average",
    normal: "Within the usual range",
    underproducing: "Underproducing",
    overproducing: "Overproducing",
};

export function ProductionRunDetailModal({
    isOpen,
    onClose,
    productionRun,
    onDelete,
    isDeleting = false,
}: ProductionRunDetailModalProps) {
    if (!productionRun) return null;
    const performance = productionRun.performance;
    const alertColor =
        performance.status === "underproducing"
            ? "danger"
            : performance.status === "normal"
              ? "success"
              : performance.status === "overproducing"
                ? "primary"
                : "default";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl">
            <ModalContent>
                <ModalHeader className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-primary" />
                    Production Run Details
                </ModalHeader>
                <ModalBody className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border p-3 dark:border-zinc-800">
                            <p className="flex items-center gap-2 text-xs text-zinc-500">
                                <Package className="h-3 w-3" />
                                Product
                            </p>
                            <p className="mt-1 font-semibold">
                                {productionRun.product_name || productionRun.composite_name}
                            </p>
                        </div>
                        <div className="rounded-lg border p-3 dark:border-zinc-800">
                            <p className="flex items-center gap-2 text-xs text-zinc-500">
                                <ChefHat className="h-3 w-3" />
                                Actual output
                            </p>
                            <p className="mt-1 text-xl font-bold">
                                {productionRun.quantity_produced.toFixed(2)} pcs
                            </p>
                        </div>
                        <div className="rounded-lg border p-3 dark:border-zinc-800">
                            <p className="flex items-center gap-2 text-xs text-zinc-500">
                                <Calendar className="h-3 w-3" />
                                Recorded
                            </p>
                            <p className="mt-1 text-sm font-medium">
                                {new Date(productionRun.date_produced).toLocaleString()}
                            </p>
                        </div>
                        <div className="rounded-lg border p-3 dark:border-zinc-800">
                            <p className="flex items-center gap-2 text-xs text-zinc-500">
                                <User className="h-3 w-3" />
                                Chef
                            </p>
                            <p className="mt-1 font-medium">{productionRun.chef_name || "-"}</p>
                        </div>
                    </div>

                    {!!productionRun.usages.length && (
                        <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
                            <p className="text-xs uppercase tracking-wide text-zinc-500">
                                Kitchen ingredients used
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {productionRun.usages.map((usage) => (
                                    <div
                                        key={usage.ingredient__name}
                                        className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-semibold">
                                                {usage.ingredient__name}
                                            </p>
                                            <Chip variant="flat" size="sm">
                                                {usage.actual_amount.toFixed(3)}{" "}
                                                {usage.ingredient__unit}
                                            </Chip>
                                        </div>
                                        <p className="mt-2 text-xs text-zinc-500">
                                            Rough amount for this output:{" "}
                                            {usage.theoretical_amount.toFixed(3)}{" "}
                                            {usage.ingredient__unit}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <Alert
                        color={alertColor}
                        variant="flat"
                        startContent={<Gauge className="h-5 w-5" />}
                    >
                        <p className="font-semibold">{labels[performance.status]}</p>
                        {performance.status === "baseline" ? (
                            <p className="text-sm">
                                More runs are needed before this product can be compared with its
                                historical average.
                            </p>
                        ) : (
                            <p className="text-sm">
                                This run was{" "}
                                {Math.abs(performance.deviation_percent || 0).toFixed(1)}%{" "}
                                {performance.status === "underproducing"
                                    ? "below"
                                    : performance.status === "overproducing"
                                      ? "above"
                                      : "away from"}{" "}
                                the working average. The strongest signal came from{" "}
                                {performance.ingredient_name}. Based on that amount, expected output
                                was about{` `}
                                {(performance.expected_output_from_average || 0).toFixed(1)} pcs.
                            </p>
                        )}
                    </Alert>

                    {!!performance.ingredients?.length && (
                        <div>
                            <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                                Ingredient signals
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {performance.ingredients.map((ingredient) => {
                                    const color =
                                        ingredient.status === "underproducing"
                                            ? "danger"
                                            : ingredient.status === "overproducing"
                                              ? "primary"
                                              : ingredient.status === "normal"
                                                ? "success"
                                                : "default";
                                    return (
                                        <Chip
                                            key={ingredient.ingredient_name}
                                            color={color}
                                            variant="flat"
                                        >
                                            {ingredient.ingredient_name}:{" "}
                                            {labels[ingredient.status]}
                                            {ingredient.status !== "baseline" &&
                                                ` (${ingredient.deviation_percent && ingredient.deviation_percent > 0 ? "+" : ""}${(ingredient.deviation_percent || 0).toFixed(1)}%)`}
                                        </Chip>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {productionRun.notes && (
                        <div>
                            <p className="text-xs text-zinc-500">Notes</p>
                            <p className="mt-1 text-sm whitespace-pre-wrap">
                                {productionRun.notes}
                            </p>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button variant="flat" onPress={onClose}>
                        Close
                    </Button>
                    {onDelete && (
                        <Button
                            color="danger"
                            onPress={() => onDelete(productionRun)}
                            isLoading={isDeleting}
                            startContent={<AlertTriangle className="h-4 w-4" />}
                        >
                            Delete Run
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
