import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboardService";
export function useOwnerDashboard(enabled = true) {
    return useQuery({
        queryKey: ["ownerDashboard"],
        queryFn: async () => {
            return await dashboardService.getOwnerDashboard();
        },
        refetchInterval: 3000,
        enabled,
    });
}


