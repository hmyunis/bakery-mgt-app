import { tr } from "../locales";
import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/authService";
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
    return useMutation({
        mutationFn: (data: FactoryResetPayload) => authService.factoryReset(data),
        onSuccess: () => {
            // ApiResponse<unknown> doesn't have errors property, assume success
            toast.success(tr("Factory reset completed successfully."));
        },
        onError: (error: unknown) => {
            console.error("Factory reset failed:", error);
            const apiError = error as ApiError;
            const errorMsg =
                apiError.response?.data?.detail ||
                apiError.response?.data?.password?.[0] ||
                apiError.response?.data?.confirmation?.[0] ||
                apiError.response?.data?.non_field_errors?.[0] ||
                tr("Factory reset failed. Please try again.");
            toast.error(errorMsg);
        },
    });
}
