/**
 * Audit Log types matching the backend audit.AuditLog model/serializer
 * @see api/audit/models.py
 * @see api/audit/serializers.py
 */

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export interface AuditLog {
    id: number;
    actor: number | null;
    actorName?: string | null;
    actorFullName?: string | null;
    ipAddress?: string | null;
    timestamp: string;

    action: AuditAction;
    tableName: string;
    recordId: string;

    oldValue?: unknown;
    newValue?: unknown;
}

export interface AuditLogListParams {
    page?: number;
    page_size?: number;
    search?: string;
    action?: AuditAction;
    table_name?: string;
    actor?: number;
    ordering?: string; // e.g. "-timestamp"
    start_date?: string;
}


