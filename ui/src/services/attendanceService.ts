import { apiClient } from "../lib/apiClient";
import type { ApiResponse, PaginatedResponse, WrappedPaginatedResponse } from "../types/api";
import type {
    AttendanceDailySummary,
    AttendanceRecord,
    AttendanceStatus,
} from "../types/attendance";

export interface AttendanceListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: AttendanceRecord[];
}

export interface AttendanceListParams {
    page?: number;
    pageSize?: number;
    employeeId?: number | "";
    status?: AttendanceStatus | "";
    ordering?: string;
}

export interface AttendanceUpsertData {
    employeeId: number;
    shiftId: number;
    shiftDate: string; // YYYY-MM-DD
    status: AttendanceStatus;
    lateMinutes?: number;
    overtimeMinutes?: number;
    notes?: string;
}

export interface UpdateAttendanceRecordData {
    status?: AttendanceStatus;
    lateMinutes?: number;
    overtimeMinutes?: number;
    notes?: string | null;
}

export class AttendanceService {
    private normalizeAttendanceRecord(obj: Record<string, unknown>): AttendanceRecord {
        return {
            id: obj.id as number,
            assignment: obj.assignment as number,
            employeeName: (obj.employeeName || obj.employee_name) as string,
            shiftName: (obj.shiftName || obj.shift_name) as string,
            shiftDate: (obj.shiftDate || obj.shift_date) as string,
            status: obj.status as AttendanceStatus,
            lateMinutes: (obj.lateMinutes || obj.late_minutes || 0) as number,
            overtimeMinutes: (obj.overtimeMinutes || obj.overtime_minutes || 0) as number,
            recordedAt: (obj.recordedAt || obj.recorded_at) as string,
            notes: (obj.notes as string) ?? null,
        };
    }

    private normalizeDailySummary(obj: Record<string, unknown>): AttendanceDailySummary {
        const breakdown = (obj.statusBreakdown || obj.status_breakdown || []) as Record<
            string,
            unknown
        >[];
        return {
            date: String(obj.date),
            totalRecords: Number(obj.totalRecords ?? obj.total_records ?? 0),
            totalScheduledMinutes: Number(
                obj.totalScheduledMinutes ?? obj.total_scheduled_minutes ?? 0
            ),
            totalWorkedMinutes: Number(obj.totalWorkedMinutes ?? obj.total_worked_minutes ?? 0),
            statusBreakdown: breakdown.map((x) => ({
                status: x.status as AttendanceStatus,
                count: Number(x.count || 0),
                totalLate: (x.totalLate || x.total_late) as number | null | undefined,
                totalOvertime: (x.totalOvertime || x.total_overtime) as number | null | undefined,
            })),
        };
    }

    async getAttendance(params: AttendanceListParams = {}): Promise<AttendanceListResponse> {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append("page", params.page.toString());
        if (params.pageSize) queryParams.append("page_size", params.pageSize.toString());
        if (params.employeeId !== undefined && params.employeeId !== "")
            queryParams.append("assignment__employee", params.employeeId.toString());
        if (params.status) queryParams.append("status", params.status);
        if (params.ordering) queryParams.append("ordering", params.ordering);

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/users/attendance/?${queryParams.toString()}`);

        const data = response.data;

        if (data && !Array.isArray(data) && "data" in data && "pagination" in data) {
            const wrapped = data as WrappedPaginatedResponse<Record<string, unknown>>;
            return {
                count: wrapped.pagination.count || 0,
                next: wrapped.pagination.next || null,
                previous: wrapped.pagination.previous || null,
                results: (wrapped.data || []).map((x) => this.normalizeAttendanceRecord(x)),
            };
        }

        if (data && !Array.isArray(data) && "results" in data) {
            const paginated = data as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((x) => this.normalizeAttendanceRecord(x)),
            };
        }

        if (Array.isArray(data)) {
            return {
                count: data.length,
                next: null,
                previous: null,
                results: data.map((x) => this.normalizeAttendanceRecord(x)),
            };
        }

        return { count: 0, next: null, previous: null, results: [] };
    }

    async upsertAttendance(data: AttendanceUpsertData): Promise<AttendanceRecord> {
        const payload: Record<string, unknown> = {
            employee: data.employeeId,
            shift: data.shiftId,
            shift_date_input: data.shiftDate,
            status: data.status,
            notes: data.notes,
        };

        if (data.lateMinutes !== undefined) payload.late_minutes = data.lateMinutes;
        if (data.overtimeMinutes !== undefined) payload.overtime_minutes = data.overtimeMinutes;

        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/users/attendance/upsert/", payload);

        const obj =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        return this.normalizeAttendanceRecord(obj);
    }

    async updateAttendanceRecord(
        id: number,
        data: UpdateAttendanceRecordData
    ): Promise<AttendanceRecord> {
        const payload: Record<string, unknown> = {};
        if (data.status !== undefined) payload.status = data.status;
        if (data.lateMinutes !== undefined) payload.late_minutes = data.lateMinutes;
        if (data.overtimeMinutes !== undefined) payload.overtime_minutes = data.overtimeMinutes;
        if (data.notes !== undefined) payload.notes = data.notes;

        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/users/attendance/${id}/`, payload);

        const obj =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        return this.normalizeAttendanceRecord(obj);
    }

    async deleteAttendanceRecord(id: number): Promise<void> {
        await apiClient.delete(`/users/attendance/${id}/`);
    }

    async getDailySummary(dateStr: string): Promise<AttendanceDailySummary> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/users/attendance/daily_summary/?date=${dateStr}`);

        const obj =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        return this.normalizeDailySummary(obj as Record<string, unknown>);
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

export const attendanceService = new AttendanceService();
