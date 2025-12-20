import { useQuery } from "@tanstack/react-query";
import { auditService } from "../services/auditService";
import type { AuditLogListParams } from "../types/audit";

export function useAuditLogs(params: AuditLogListParams = {}) {
    return useQuery({
        queryKey: ["auditLogs", params],
        queryFn: async () => {
            return await auditService.getAuditLogs(params);
        },
        placeholderData: (previousData) => previousData,
    });
}
