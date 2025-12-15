import { apiClient } from "../lib/apiClient";
import type { AuditLog, AuditLogListParams } from "../types/audit";

export interface AuditLogListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: AuditLog[];
}

class AuditService {
    private normalizeAuditLog(row: any): AuditLog {
        return {
            id: Number(row.id),
            actor: row.actor ?? null,
            actorName: row.actorName ?? row.actor_name ?? null,
            actorFullName: row.actorFullName ?? row.actor_full_name ?? null,
            ipAddress: row.ipAddress ?? row.ip_address ?? null,
            timestamp: row.timestamp,
            action: row.action,
            tableName: row.tableName ?? row.table_name,
            recordId: row.recordId ?? row.record_id,
            oldValue: row.oldValue ?? row.old_value,
            newValue: row.newValue ?? row.new_value,
        };
    }

    async getAuditLogs(params: AuditLogListParams = {}): Promise<AuditLogListResponse> {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.search) queryParams.append("search", params.search);
        if (params.action) queryParams.append("action", params.action);
        if (params.table_name) queryParams.append("table_name", params.table_name);
        if (params.actor) queryParams.append("actor", params.actor.toString());
        if (params.ordering) queryParams.append("ordering", params.ordering);

        const response = await apiClient.get<any>(`/audit/?${queryParams.toString()}`);

        // Handle custom response format: { success, message, data: [...], pagination: { count, next, previous } }
        if (response.data && "data" in response.data && "pagination" in response.data) {
            const pagination = response.data.pagination || {};
            return {
                count: pagination.count || 0,
                next: pagination.next || null,
                previous: pagination.previous || null,
                results: (response.data.data || []).map((r: any) => this.normalizeAuditLog(r)),
            };
        }

        // Handle standard DRF pagination format: { count, next, previous, results: [...] }
        if (response.data && "results" in response.data) {
            return {
                ...response.data,
                results: (response.data.results || []).map((r: any) => this.normalizeAuditLog(r)),
            };
        }

        // Fallback (non-paginated array)
        const rows = Array.isArray(response.data) ? response.data : [];
        return {
            count: rows.length,
            next: null,
            previous: null,
            results: rows.map((r: any) => this.normalizeAuditLog(r)),
        };
    }
}

export const auditService = new AuditService();


