import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/authService";
import type { ApiError } from "../types/api";
import { toast } from "sonner";

export function useFactoryReset() {
    return useMutation({
        mutationFn: (data: { confirmation: string }) => authService.factoryReset(data),
        onSuccess: () => {
            // ApiResponse<unknown> doesn't have errors property, assume success
            toast.success("Factory reset completed successfully.");
        },
        onError: (error: unknown) => {
            console.error("Factory reset failed:", error);
            const apiError = error as ApiError;
            const errorMsg =
                apiError.response?.data?.detail ||
                apiError.response?.data?.password?.[0] ||
                apiError.response?.data?.non_field_errors?.[0] ||
                "Factory reset failed. Please try again.";
            toast.error(errorMsg);
        },
    });
}
