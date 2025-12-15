import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bakeryService } from "../services/bakeryService";
import type { BakerySettings } from "../types/bakery";
import { toast } from "sonner";

export function useBakerySettings() {
    return useQuery({
        queryKey: ["bakerySettings"],
        queryFn: async () => {
            return await bakeryService.getBakerySettings();
        },
        staleTime: Infinity,
        retry: 1,
    });
}

export function useUpdateBakerySettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            return await bakeryService.updateBakerySettings(formData);
        },
        onSuccess: (data) => {
            queryClient.setQueryData<BakerySettings>(["bakerySettings"], data);
            toast.success("Bakery settings updated successfully!");
        },
        onError: (error: any) => {
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.detail ||
                "Failed to update bakery settings. Please try again.";
            toast.error(errorMessage);
        },
    });
}

