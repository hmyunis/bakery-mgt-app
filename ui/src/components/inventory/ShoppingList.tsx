import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Spinner, Alert } from "@heroui/react";
import { ShoppingCart, Copy, Share2, AlertTriangle, Check } from "lucide-react";
import { useShoppingList } from "../../hooks/useInventory";
import { toast } from "sonner";

export function ShoppingList() {
    const { data, isLoading, error } = useShoppingList();
    const [copied, setCopied] = useState(false);

    const handleCopyToClipboard = async () => {
        const textToCopy = data?.share_text || "";
        if (!textToCopy) {
            toast.error("No shopping list data to copy");
            return;
        }

        try {
            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(textToCopy);
                setCopied(true);
                toast.success("Shopping list copied to clipboard!");
                setTimeout(() => setCopied(false), 2000);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement("textarea");
                textArea.value = textToCopy;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand("copy");
                    setCopied(true);
                    toast.success("Shopping list copied to clipboard!");
                    setTimeout(() => setCopied(false), 2000);
                } catch {
                    toast.error("Failed to copy to clipboard");
                }
                document.body.removeChild(textArea);
            }
        } catch (err) {
            console.error("Copy error:", err);
            toast.error("Failed to copy to clipboard. Please copy manually.");
        }
    };

    const handleShareTelegram = () => {
        const textToShare = data?.share_text || "";
        if (!textToShare) {
            toast.error("No shopping list data to share");
            return;
        }

        try {
            // Telegram share URL format: url parameter is the title, text parameter is the message
            const title = encodeURIComponent("Hi, please buy the following items:");
            const text = encodeURIComponent(textToShare);
            const telegramUrl = `https://t.me/share/url?url=${title}&text=${text}`;
            window.open(telegramUrl, "_blank", "noopener,noreferrer");
        } catch (err) {
            console.error("Telegram share error:", err);
            toast.error("Failed to open Telegram. Please copy the list manually.");
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardBody className="flex items-center justify-center py-12">
                    <Spinner size="lg" />
                </CardBody>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardBody>
                    <Alert color="danger" title="Error loading shopping list">
                        {error instanceof Error ? error.message : "Failed to load shopping list"}
                    </Alert>
                </CardBody>
            </Card>
        );
    }

    const items = data?.items || [];
    const shareText = data?.share_text || "";

    if (items.length === 0) {
        return (
            <Card>
                <CardBody className="py-12">
                    <div className="flex flex-col items-center justify-center text-center">
                        <ShoppingCart className="h-12 w-12 text-zinc-400 mb-4" />
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                            All Stock Levels Good
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            No items need to be reordered at this time.
                        </p>
                    </div>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Smart Shopping List
                    </h3>
                    <Chip color="warning" variant="flat" size="sm">
                        {items.length} {items.length === 1 ? "item" : "items"}
                    </Chip>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="flat"
                        size="sm"
                        startContent={
                            copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />
                        }
                        onPress={handleCopyToClipboard}
                        isDisabled={!shareText || isLoading}
                    >
                        {copied ? "Copied!" : "Copy"}
                    </Button>
                    <Button
                        color="primary"
                        size="sm"
                        startContent={<Share2 className="h-4 w-4" />}
                        onPress={handleShareTelegram}
                        isDisabled={!shareText || isLoading}
                    >
                        Share to Telegram
                    </Button>
                </div>
            </CardHeader>
            <CardBody className="pt-4">
                <div className="space-y-3">
                    {items.map((item) => {
                        const shortfall = item.reorder_point - item.current_stock;
                        const suggestedQty = Math.max(shortfall * 2, 10);

                        return (
                            <div
                                key={item.id}
                                className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                            >
                                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {item.name}
                                        </h4>
                                        <Chip color="warning" variant="flat" size="sm">
                                            Low Stock
                                        </Chip>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-zinc-600 dark:text-zinc-400">
                                                Current Stock:{" "}
                                            </span>
                                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                                {item.current_stock.toFixed(3)} {item.unit}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-zinc-600 dark:text-zinc-400">
                                                Reorder Point:{" "}
                                            </span>
                                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                                {item.reorder_point.toFixed(3)} {item.unit}
                                            </span>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <span className="text-zinc-600 dark:text-zinc-400">
                                                Shortfall:{" "}
                                            </span>
                                            <span className="font-medium text-warning-600 dark:text-warning-400">
                                                {shortfall.toFixed(3)} {item.unit}
                                            </span>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <span className="text-zinc-600 dark:text-zinc-400">
                                                Suggested to buy:{" "}
                                            </span>
                                            <span className="font-semibold text-primary">
                                                ~{suggestedQty.toFixed(0)} {item.unit}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardBody>
        </Card>
    );
}
