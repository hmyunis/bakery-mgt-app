import { Card, CardBody, CardHeader } from "@heroui/react";
import { ShoppingCart, Receipt } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";

export function SalesPage() {
    return (
        <div className="space-y-6 lg:space-y-8">
            <PageHeader
                title="Sales"
                subtitle="Process transactions, manage orders, and track daily revenue."
                icon={<ShoppingCart className="size-6 lg:size-7" />}
                iconColor="violet"
            />

            <Card className="bg-[var(--panel)]/80 backdrop-blur-xl border border-white/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent" />

                <CardHeader className="flex items-center gap-3 relative">
                    <div className="p-2.5 rounded-xl bg-violet-500/10">
                        <Receipt className="size-5 text-violet-400" />
                    </div>
                    <h2 className="text-lg lg:text-xl font-semibold text-[var(--fg)]">
                        Sales Management
                    </h2>
                </CardHeader>

                <CardBody className="relative">
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-violet-500/10 mb-4">
                            <ShoppingCart className="size-8 text-violet-400" />
                        </div>
                        <p className="text-[var(--muted)] text-lg">
                            Sales management features will be implemented here.
                        </p>
                        <p className="text-[var(--muted)] text-sm mt-2">
                            Process orders and generate sales reports.
                        </p>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
