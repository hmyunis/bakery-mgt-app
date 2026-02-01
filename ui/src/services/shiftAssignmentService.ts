import { apiClient } from "../lib/apiClient";
import type { ApiResponse, PaginatedResponse, WrappedPaginatedResponse } from "../types/api";
import type { ShiftAssignment } from "../types/shiftAssignment";

export interface ShiftAssignmentsListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: ShiftAssignment[];
}

export interface ShiftAssignmentsListParams {
    page?: number;
    pageSize?: number;
    employee?: number | "";
    shift?: number | "";
    shiftDate?: string | ""; // YYYY-MM-DD
    ordering?: string;
}

export interface CreateShiftAssignmentData {
    employee: number;
    shift: number;
    shiftDate: string;
}

export interface UpdateShiftAssignmentData {
    employee?: number;
    shift?: number;
    shiftDate?: string;
}

export interface BulkCreateShiftAssignmentsData {
    employee: number;
    shift: number;
    startDate: string;
    endDate: string;
    skipWeekends?: boolean;
    skipLeaveDays?: boolean;
}

export interface BulkCreateShiftAssignmentsResult {
    createdCount: number;
    createdIds: number[];
    skippedExisting: number;
    skippedWeekends: number;
    skippedLeaveDays: number;
}

export class ShiftAssignmentService {
    private normalizeShiftAssignment(obj: Record<string, unknown>): ShiftAssignment {
        return {
            id: obj.id as number,
            employee: obj.employee as number,
            employeeName: (obj.employeeName || obj.employee_name) as string,
            shift: obj.shift as number,
            shiftName: (obj.shiftName || obj.shift_name) as string,
            shiftDate: (obj.shiftDate || obj.shift_date) as string,
            createdAt: (obj.createdAt || obj.created_at) as string,
        };
    }

    async getShiftAssignments(
        params: ShiftAssignmentsListParams = {}
    ): Promise<ShiftAssignmentsListResponse> {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append("page", params.page.toString());
        if (params.pageSize) queryParams.append("page_size", params.pageSize.toString());
        if (params.employee !== undefined && params.employee !== "")
            queryParams.append("employee", params.employee.toString());
        if (params.shift !== undefined && params.shift !== "")
            queryParams.append("shift", params.shift.toString());
        if (params.shiftDate) queryParams.append("shift_date", params.shiftDate);
        if (params.ordering) queryParams.append("ordering", params.ordering);

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/users/shift-assignments/?${queryParams.toString()}`);

        const data = response.data;

        if (data && !Array.isArray(data) && "data" in data && "pagination" in data) {
            const wrapped = data as WrappedPaginatedResponse<Record<string, unknown>>;
            return {
                count: wrapped.pagination.count || 0,
                next: wrapped.pagination.next || null,
                previous: wrapped.pagination.previous || null,
                results: (wrapped.data || []).map((x) => this.normalizeShiftAssignment(x)),
            };
        }

        if (data && !Array.isArray(data) && "results" in data) {
            const paginated = data as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((x) => this.normalizeShiftAssignment(x)),
            };
        }

        if (Array.isArray(data)) {
            return {
                count: data.length,
                next: null,
                previous: null,
                results: data.map((x) => this.normalizeShiftAssignment(x)),
            };
        }

        return { count: 0, next: null, previous: null, results: [] };
    }

    async createShiftAssignment(data: CreateShiftAssignmentData): Promise<ShiftAssignment> {
        const payload: Record<string, unknown> = {
            employee: data.employee,
            shift: data.shift,
            shift_date: data.shiftDate,
        };

        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/users/shift-assignments/", payload);

        const obj =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        return this.normalizeShiftAssignment(obj);
    }

    async updateShiftAssignment(
        id: number,
        data: UpdateShiftAssignmentData
    ): Promise<ShiftAssignment> {
        const payload: Record<string, unknown> = {};
        if (data.employee !== undefined) payload.employee = data.employee;
        if (data.shift !== undefined) payload.shift = data.shift;
        if (data.shiftDate !== undefined) payload.shift_date = data.shiftDate;

        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/users/shift-assignments/${id}/`, payload);

        const obj =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        return this.normalizeShiftAssignment(obj);
    }

    async deleteShiftAssignment(id: number): Promise<void> {
        await apiClient.delete(`/users/shift-assignments/${id}/`);
    }

    async bulkCreateShiftAssignments(
        data: BulkCreateShiftAssignmentsData
    ): Promise<BulkCreateShiftAssignmentsResult> {
        const payload: Record<string, unknown> = {
            employee: data.employee,
            shift: data.shift,
            start_date: data.startDate,
            end_date: data.endDate,
            skip_weekends: data.skipWeekends ?? true,
            skip_leave_days: data.skipLeaveDays ?? true,
        };

        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/users/shift-assignments/bulk_create/", payload);

        const obj =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        return {
            createdCount: Number(obj.created_count ?? obj.createdCount ?? 0),
            createdIds: (obj.created_ids ?? obj.createdIds ?? []) as number[],
            skippedExisting: Number(obj.skipped_existing ?? obj.skippedExisting ?? 0),
            skippedWeekends: Number(obj.skipped_weekends ?? obj.skippedWeekends ?? 0),
            skippedLeaveDays: Number(obj.skipped_leave_days ?? obj.skippedLeaveDays ?? 0),
        };
    }

    parseApiError(error: unknown): string {
        const err = error as { response?: { data?: unknown } };
        const data = err.response?.data as Record<string, unknown> | undefined;

        const message =
            (data?.message as string) ||
            (data?.detail as string) ||
            (data?.error as string) ||
            undefined;

        if (message) return message;

        if (data && typeof data === "object") {
            const firstKey = Object.keys(data)[0];
            const val = (data as Record<string, unknown>)[firstKey];
            if (Array.isArray(val) && val[0]) return String(val[0]);
            if (typeof val === "string") return val;
        }

        return "Something went wrong";
    }
}

export const shiftAssignmentService = new ShiftAssignmentService();
