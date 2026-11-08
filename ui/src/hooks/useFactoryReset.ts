import { tr } from "../locales";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authService, type FactoryResetResponse } from "../services/authService";
import type { ApiError } from "../types/api";
import { toast } from "sonner";

export interface FactoryResetPayload {
    password?: string;
    confirmation?: string;
    delete_users?: boolean;
    delete_products?: boolean;
    delete_ingredients?: boolean;
    delete_recipes?: boolean;
    delete_production_runs?: boolean;
    delete_sales?: boolean;
    delete_purchases?: boolean;
    delete_payment_methods?: boolean;
    delete_audit_logs?: boolean;
    delete_notifications?: boolean;
    [key: string]: unknown;
}

export function useFactoryReset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: FactoryResetPayload) => authService.factoryReset(data),
        onSuccess: (data: FactoryResetResponse) => {
            if (data?.errors && data.errors.length > 0) {
                const totalDeleted = Object.values(data.deleted_counts || {}).reduce(
                    (a, b) => a + b,
                    0
                );
                if (totalDeleted > 0) {
                    toast.warning(
                        `${tr("Factory reset completed with some errors.")} ${data.errors.join(". ")}`
                    );
                } else {
                    toast.error(
                        data.errors.join("\n") || tr("Factory reset failed. Please try again.")
                    );
                }
            } else {
                toast.success(tr("Factory reset completed successfully."));
            }
            queryClient.clear();
            queryClient.invalidateQueries();
        },
        onError: (error: unknown) => {
            console.error("Factory reset failed:", error);
            const apiError = error as ApiError;
            const errorMsg =
                apiError.response?.data?.detail ||
                (Array.isArray(apiError.response?.data?.errors)
                    ? apiError.response?.data?.errors.join("\n")
                    : null) ||
                apiError.response?.data?.message ||
                apiError.response?.data?.password?.[0] ||
                apiError.response?.data?.confirmation?.[0] ||
                apiError.response?.data?.non_field_errors?.[0] ||
                tr("Factory reset failed. Please try again.");
            toast.error(errorMsg);
        },
    });
}
