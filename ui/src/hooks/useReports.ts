import { useQuery, useMutation } from "@tanstack/react-query";
import { reportsService } from "../services/reportsService";
import { toast } from "sonner";

export function useDashboardStats(date?: string) {
    return useQuery({
        queryKey: ["dashboard-stats", date],
        queryFn: () => reportsService.getDashboardStats(date),
    });
}

export function useExportReport() {
    return useMutation({
        mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
            await reportsService.exportReport(startDate, endDate);
        },
        onSuccess: () => {
            toast.success("Report downloaded successfully!");
        },
        onError: () => {
            toast.error("Failed to download report.");
        },
    });
}
