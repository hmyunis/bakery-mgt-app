import { apiClient } from "../lib/apiClient";
import type { AuditLog, AuditLogListParams, AuditAction } from "../types/audit";
import type { WrappedPaginatedResponse, PaginatedResponse } from "../types/api";

export interface AuditLogListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: AuditLog[];
}

class AuditService {
    private normalizeAuditLog(row: Record<string, unknown>): AuditLog {
        return {
            id: Number(row.id),
            actor: (row.actor as number) ?? null,
            actorName: (row.actorName ?? row.actor_name ?? null) as string | null,
            actorFullName: (row.actorFullName ?? row.actor_full_name ?? null) as string | null,
            ipAddress: (row.ipAddress ?? row.ip_address ?? null) as string | null,
            timestamp: row.timestamp as string,
            action: row.action as AuditAction, // Cast to any then to AuditAction if needed, or just AuditAction if imported
            tableName: (row.tableName ?? row.table_name) as string,
            recordId: (row.recordId ?? row.record_id) as string,
            oldValue: (row.oldValue ?? row.old_value) as string,
            newValue: (row.newValue ?? row.new_value) as string,
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
        if (params.start_date) queryParams.append("start_date", params.start_date);

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/audit/?${queryParams.toString()}`);

        const responseData = response.data;

        // Handle custom response format: { success, message, data: [...], pagination: { count, next, previous } }
        if (
            responseData &&
            !Array.isArray(responseData) &&
            "data" in responseData &&
            "pagination" in responseData
        ) {
            const wrapped = responseData as WrappedPaginatedResponse<Record<string, unknown>>;
            return {
                count: wrapped.pagination.count || 0,
                next: wrapped.pagination.next || null,
                previous: wrapped.pagination.previous || null,
                results: (wrapped.data || []).map((r) => this.normalizeAuditLog(r)),
            };
        }

        // Handle standard DRF pagination format: { count, next, previous, results: [...] }
        if (responseData && !Array.isArray(responseData) && "results" in responseData) {
            const paginated = responseData as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((r) => this.normalizeAuditLog(r)),
            };
        }

        // Fallback (non-paginated array)
        if (Array.isArray(responseData)) {
            return {
                count: responseData.length,
                next: null,
                previous: null,
                results: responseData.map((r) =>
                    this.normalizeAuditLog(r as Record<string, unknown>)
                ),
            };
        }

        return {
            count: 0,
            next: null,
            previous: null,
            results: [],
        };
    }
}

export const auditService = new AuditService();
