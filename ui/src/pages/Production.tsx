import { Card, CardBody, CardHeader } from "@heroui/react";
import { ChefHat, Utensils } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";

export function ProductionPage() {
    return (
        <div className="space-y-6 lg:space-y-8">
            <PageHeader
                title="Production"
                subtitle="Manage production orders, recipes, and track baking schedules."
                icon={<ChefHat className="size-6 lg:size-7" />}
                iconColor="amber"
            />

            <Card className="bg-[var(--panel)]/80 backdrop-blur-xl border border-white/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />

                <CardHeader className="flex items-center gap-3 relative">
                    <div className="p-2.5 rounded-xl bg-amber-500/10">
                        <Utensils className="size-5 text-amber-400" />
                    </div>
                    <h2 className="text-lg lg:text-xl font-semibold text-[var(--fg)]">
                        Production Management
                    </h2>
                </CardHeader>

                <CardBody className="relative">
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-amber-500/10 mb-4">
                            <ChefHat className="size-8 text-amber-400" />
                        </div>
                        <p className="text-[var(--muted)] text-lg">
                            Production management features will be implemented here.
                        </p>
                        <p className="text-[var(--muted)] text-sm mt-2">
                            Schedule production runs and manage recipes.
                        </p>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
