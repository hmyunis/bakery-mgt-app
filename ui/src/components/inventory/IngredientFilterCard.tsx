import React, { useState } from "react";
import { Input, Button, Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";
import { Search, Info, TrendingUp, AlertTriangle, Package } from "lucide-react";

interface IngredientFilterCardProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    isLoading?: boolean;
}

export const IngredientFilterCard: React.FC<IngredientFilterCardProps> = ({
    searchQuery,
    onSearchChange,
    isLoading,
}) => {
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    return (
        <>
            <div className="flex items-center gap-3">
                <div
                    className={`
          w-full sm:w-64 lg:w-72
          focus-within:sm:w-96
          transition-[width] duration-300 ease-in-out
        `}
                >
                    <Input
                        placeholder="Search by name..."
                        value={searchQuery}
                        onValueChange={onSearchChange}
                        isDisabled={isLoading}
                        startContent={<Search className="h-5 w-5 text-slate-400" />}
                        isClearable
                        classNames={{
                            input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                        }}
                    />
                </div>

                <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    className="min-w-8 w-8 h-8 p-2"
                    onPress={() => setIsInfoModalOpen(true)}
                >
                    <Info className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </Button>
            </div>

            <Modal
                isOpen={isInfoModalOpen}
                onClose={() => setIsInfoModalOpen(false)}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader className="flex items-center gap-3">
                        <Package className="h-6 w-6 text-primary" />
                        <div>
                            <h3 className="text-lg font-semibold">Inventory Management Guide</h3>
                            <p className="text-sm text-muted-foreground">
                                Understanding key inventory concepts and features
                            </p>
                        </div>
                    </ModalHeader>
                    <ModalBody className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                        Current Stock
                                    </h4>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        Shows the current quantity of each ingredient in your
                                        inventory. This value is automatically updated when you
                                        record purchases or adjust stock levels.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                                        Reorder Point
                                    </h4>
                                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                                        The minimum stock level that triggers a reorder alert. When
                                        current stock falls below this threshold, the item is
                                        highlighted as "Low Stock" to indicate you need to reorder.
                                    </p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                                        Purpose: Prevents stockouts and ensures you always have
                                        ingredients available for production.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                                        Average Cost per Unit
                                    </h4>
                                    <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                                        The weighted average cost of purchasing this ingredient.
                                        This is automatically calculated using the formula:
                                    </p>
                                    <div className="bg-white dark:bg-gray-800 p-2 rounded border text-xs font-mono mb-2">
                                        New Average = ((Current Stock × Current Average) + (Purchase
                                        Qty × Purchase Price)) ÷ (Current Stock + Purchase Qty)
                                    </div>
                                    <p className="text-xs text-green-600 dark:text-green-400 italic">
                                        Purpose: Provides accurate cost tracking for profitability
                                        analysis and pricing decisions. Updates automatically with
                                        each purchase.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                                        Smart Purchase Tracking
                                    </h4>
                                    <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
                                        Record purchases with flexible cost input (total cost or
                                        unit cost), vendor tracking, and automatic stock updates.
                                        The system detects price anomalies when costs deviate
                                        significantly from averages.
                                    </p>
                                    <p className="text-xs text-purple-600 dark:text-purple-400 italic">
                                        Recent vendors are saved for quick selection, and all
                                        purchase history is maintained for auditing and analysis.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <p className="text-xs text-muted-foreground text-center">
                                Use the shopping cart icon next to any ingredient to quickly record
                                a purchase for that specific item.
                            </p>
                        </div>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
};
