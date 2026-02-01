import { apiClient } from "../lib/apiClient";
import type { ApiResponse, PaginatedResponse, WrappedPaginatedResponse } from "../types/api";
import type { LeaveRecord, LeaveType } from "../types/leave";

export interface LeavesListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: LeaveRecord[];
}

export interface LeavesListParams {
    page?: number;
    pageSize?: number;
    employee?: number | "";
    leaveType?: LeaveType | "";
    ordering?: string;
}

export interface CreateLeaveRecordData {
    employee: number;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    notes?: string;
}

export interface UpdateLeaveRecordData {
    employee?: number;
    leaveType?: LeaveType;
    startDate?: string;
    endDate?: string;
    notes?: string;
}

export class LeaveService {
    private normalizeLeaveType(value: unknown): LeaveType {
        const raw = String(value || "");
        if (raw === "misc") return "other";
        return raw as LeaveType;
    }

    private normalizeLeaveRecord(obj: Record<string, unknown>): LeaveRecord {
        return {
            id: obj.id as number,
            employee: (obj.employee as number) ?? 0,
            employeeName: (obj.employeeName || obj.employee_name) as string,
            leaveType: this.normalizeLeaveType(obj.leaveType || obj.leave_type),
            startDate: (obj.startDate || obj.start_date) as string,
            endDate: (obj.endDate || obj.end_date) as string,
            dayCount: Number(obj.dayCount ?? obj.day_count ?? 0),
            notes: (obj.notes as string) ?? null,
            createdAt: (obj.createdAt || obj.created_at) as string,
        };
    }

    async getLeaves(params: LeavesListParams = {}): Promise<LeavesListResponse> {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.pageSize) queryParams.append("page_size", params.pageSize.toString());
        if (params.employee !== undefined && params.employee !== "")
            queryParams.append("employee", params.employee.toString());
        if (params.leaveType) queryParams.append("leave_type", params.leaveType);
        if (params.ordering) queryParams.append("ordering", params.ordering);

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/users/leaves/?${queryParams.toString()}`);

        const data = response.data;

        if (data && !Array.isArray(data) && "data" in data && "pagination" in data) {
            const wrapped = data as WrappedPaginatedResponse<Record<string, unknown>>;
            return {
                count: wrapped.pagination.count || 0,
                next: wrapped.pagination.next || null,
                previous: wrapped.pagination.previous || null,
                results: (wrapped.data || []).map((x) => this.normalizeLeaveRecord(x)),
            };
        }

        if (data && !Array.isArray(data) && "results" in data) {
            const paginated = data as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((x) => this.normalizeLeaveRecord(x)),
            };
        }

        if (Array.isArray(data)) {
            return {
                count: data.length,
                next: null,
                previous: null,
                results: data.map((x) => this.normalizeLeaveRecord(x)),
            };
        }

        return { count: 0, next: null, previous: null, results: [] };
    }

    async createLeave(data: CreateLeaveRecordData): Promise<LeaveRecord> {
        const payload: Record<string, unknown> = {
            employee: data.employee,
            leave_type: data.leaveType,
            start_date: data.startDate,
            end_date: data.endDate,
            notes: data.notes,
        };

        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/users/leaves/", payload);

        const obj =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        return this.normalizeLeaveRecord(obj);
    }

    async updateLeave(id: number, data: UpdateLeaveRecordData): Promise<LeaveRecord> {
        const payload: Record<string, unknown> = {};
        if (data.employee !== undefined) payload.employee = data.employee;
        if (data.leaveType !== undefined) payload.leave_type = data.leaveType;
        if (data.startDate !== undefined) payload.start_date = data.startDate;
        if (data.endDate !== undefined) payload.end_date = data.endDate;
        if (data.notes !== undefined) payload.notes = data.notes;

        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/users/leaves/${id}/`, payload);

        const obj =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        return this.normalizeLeaveRecord(obj);
    }

    async deleteLeave(id: number): Promise<void> {
        await apiClient.delete(`/users/leaves/${id}/`);
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

export const leaveService = new LeaveService();
