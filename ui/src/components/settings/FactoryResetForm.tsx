import { useState } from "react";
import {
    Button,
    Input,
    Switch,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
    Card,
    CardBody,
} from "@heroui/react";
import { Trash2, AlertTriangle } from "lucide-react";
import { useFactoryReset } from "../../hooks/useFactoryReset";

export function FactoryResetForm() {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const { mutateAsync: factoryReset, isPending } = useFactoryReset();

    const [password, setPassword] = useState("");
    const [selectedOptions, setSelectedOptions] = useState({
        delete_users: false,
        delete_products: false,
        delete_ingredients: false,
        delete_recipes: false,
        delete_production_runs: false,
        delete_sales: false,
        delete_purchases: false,
        delete_payment_methods: false,
        delete_audit_logs: false,
        delete_notifications: false,
    });

    const handleOptionChange = (key: string, value: boolean) => {
        setSelectedOptions((prev) => ({ ...prev, [key]: value }));
    };

    const handleSelectAll = (value: boolean) => {
        const newOptions = Object.keys(selectedOptions).reduce(
            (acc, key) => {
                acc[key as keyof typeof selectedOptions] = value;
                return acc;
            },
            {} as typeof selectedOptions
        );
        setSelectedOptions(newOptions);
    };

    const hasSelectedOptions = Object.values(selectedOptions).some((v) => v);

    const handleReset = async () => {
        if (!password) return;

        try {
            await factoryReset({
                confirmation: password,
                ...selectedOptions,
            });
            setPassword("");
            // Close modal programmatically if needed, but onOpenChange handles it
            onOpenChange();
        } catch {
            // Error handled in hook
        }
    };

    const optionLabels: Record<string, string> = {
        delete_users: "Users (except you)",
        delete_products: "Products",
        delete_ingredients: "Ingredients",
        delete_recipes: "Recipes",
        delete_production_runs: "Production Runs",
        delete_sales: "Sales",
        delete_purchases: "Purchases",
        delete_payment_methods: "Payment Methods",
        delete_audit_logs: "Audit Logs",
        delete_notifications: "Notifications",
    };

    return (
        <div className="space-y-6">
            <Card className="p-2 border-danger-200 dark:border-danger-900 bg-danger-50 dark:bg-danger-900/20">
                <CardBody className="flex flex-row items-start gap-4">
                    <div className="p-2 bg-danger-100 dark:bg-danger-900/50 rounded-full text-danger">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-danger mb-1">
                            Factory Reset Zone
                        </h3>
                        <p className="text-sm text-danger-600 dark:text-danger-400">
                            This area allows you to permanently delete data from the system. Please
                            proceed with extreme caution. Deleted data cannot be recovered.
                        </p>
                    </div>
                </CardBody>
            </Card>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="text-md font-medium">Select Data to Wipe</h4>
                    <Button
                        size="sm"
                        variant="flat"
                        color={hasSelectedOptions ? "default" : "primary"}
                        onPress={() => handleSelectAll(!hasSelectedOptions)}
                    >
                        {hasSelectedOptions ? "Deselect All" : "Select All"}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedOptions).map(([key, value]) => (
                        <Switch
                            key={key}
                            isSelected={value}
                            onValueChange={(v) => handleOptionChange(key, v)}
                            color="danger"
                            classNames={{
                                label: "text-sm text-default-600",
                            }}
                        >
                            {optionLabels[key]}
                        </Switch>
                    ))}
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-divider">
                <Button
                    color="danger"
                    startContent={<Trash2 className="h-4 w-4" />}
                    isDisabled={!hasSelectedOptions}
                    onPress={onOpen}
                >
                    Proceed to Reset
                </Button>
            </div>

            {/* Confirmation Modal */}
            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                backdrop="blur"
                classNames={{
                    header: "border-b border-divider",
                    footer: "border-t border-divider",
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1 text-danger">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Confirm Factory Reset
                                </div>
                            </ModalHeader>
                            <ModalBody className="py-6">
                                <p className="text-sm text-default-500 mb-4">
                                    You are about to permanently delete the selected data. This
                                    action <strong>cannot be undone</strong>.
                                </p>

                                <div className="bg-default-100 p-3 rounded-lg mb-4">
                                    <p className="text-xs font-semibold text-default-500 mb-2 uppercase">
                                        Selected for deletion:
                                    </p>
                                    <ul className="list-disc list-inside text-sm text-default-700 space-y-1">
                                        {Object.entries(selectedOptions)
                                            .filter(([, v]) => v)
                                            .map(([key]) => (
                                                <li key={key}>{optionLabels[key]}</li>
                                            ))}
                                    </ul>
                                </div>

                                <Input
                                    label="Admin Password"
                                    placeholder="Enter your password to confirm"
                                    type="password"
                                    variant="bordered"
                                    color="danger"
                                    value={password}
                                    onValueChange={setPassword}
                                    description="Please enter your password to confirm this action."
                                    classNames={{
                                        input: "!text-default-900",
                                    }}
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    color="danger"
                                    onPress={handleReset}
                                    isLoading={isPending}
                                    isDisabled={!password}
                                >
                                    Confirm Reset
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
