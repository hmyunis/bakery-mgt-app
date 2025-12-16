import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/authService";
import { toast } from "sonner";

export function useFactoryReset() {
    return useMutation({
        mutationFn: (data: any) => authService.factoryReset(data),
        onSuccess: (data) => {
            if (data.errors && data.errors.length > 0) {
                toast.warning(
                    "Factory reset completed with some errors. Check console for details."
                );
                console.warn("Factory reset errors:", data.errors);
            } else {
                toast.success("Factory reset completed successfully.");
            }
        },
        onError: (error: any) => {
            console.error("Factory reset failed:", error);
            const errorMsg =
                error.response?.data?.detail ||
                error.response?.data?.password?.[0] ||
                error.response?.data?.non_field_errors?.[0] ||
                "Factory reset failed. Please try again.";
            toast.error(errorMsg);
        },
    });
}
