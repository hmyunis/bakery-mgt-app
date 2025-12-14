import { ShoppingCart } from "lucide-react";
import { PageTitle } from "../components/ui/PageTitle";

export function SalesPage() {
    return (
        <div className="space-y-6 lg:space-y-8">
            <PageTitle
                title="Sales"
                subtitle="Process transactions, manage orders, and track daily revenue."
            />

            <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                <ShoppingCart className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                <p className="text-zinc-600 dark:text-zinc-400">
                    Sales management features will be implemented here.
                </p>
                <p className="text-zinc-500 dark:text-zinc-500 text-sm mt-2">
                    Process orders and generate sales reports.
                </p>
            </div>
        </div>
    );
}
