import { apiClient } from "../lib/apiClient";
import type { ApiResponse, PaginatedResponse, WrappedPaginatedResponse } from "../types/api";
import type { ShiftTemplate } from "../types/shift";

export interface ShiftTemplatesListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: ShiftTemplate[];
}

export interface ShiftTemplatesListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    ordering?: string;
}

export interface CreateShiftTemplateData {
    name: string;
    startTime: string;
    endTime: string;
    isActive?: boolean;
}

export interface UpdateShiftTemplateData {
    name?: string;
    startTime?: string;
    endTime?: string;
    isActive?: boolean;
}

export class ShiftService {
    private normalizeShiftTemplate(obj: Record<string, unknown>): ShiftTemplate {
        return {
            id: obj.id as number,
            name: (obj.name || "") as string,
            startTime: (obj.startTime || obj.start_time || "") as string,
            endTime: (obj.endTime || obj.end_time || "") as string,
            isActive: (obj.isActive ?? obj.is_active ?? true) as boolean,
        };
    }

    async getShiftTemplates(
        params: ShiftTemplatesListParams = {}
    ): Promise<ShiftTemplatesListResponse> {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append("page", params.page.toString());
        if (params.pageSize) queryParams.append("page_size", params.pageSize.toString());
        if (params.search) queryParams.append("search", params.search);
        if (params.ordering) queryParams.append("ordering", params.ordering);

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/users/shift-templates/?${queryParams.toString()}`);

        const data = response.data;

        if (data && !Array.isArray(data) && "data" in data && "pagination" in data) {
            const wrapped = data as WrappedPaginatedResponse<Record<string, unknown>>;
            return {
                count: wrapped.pagination.count || 0,
                next: wrapped.pagination.next || null,
                previous: wrapped.pagination.previous || null,
                results: (wrapped.data || []).map((x) => this.normalizeShiftTemplate(x)),
            };
        }

        if (data && !Array.isArray(data) && "results" in data) {
            const paginated = data as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((x) => this.normalizeShiftTemplate(x)),
            };
        }

        if (Array.isArray(data)) {
            return {
                count: data.length,
                next: null,
                previous: null,
                results: data.map((x) => this.normalizeShiftTemplate(x)),
            };
        }

        return { count: 0, next: null, previous: null, results: [] };
    }

    async createShiftTemplate(data: CreateShiftTemplateData): Promise<ShiftTemplate> {
        const payload: Record<string, unknown> = {
            name: data.name,
            start_time: data.startTime,
            end_time: data.endTime,
            is_active: data.isActive ?? true,
        };

        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/users/shift-templates/", payload);

        const created =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        return this.normalizeShiftTemplate(created);
    }

    async updateShiftTemplate(id: number, data: UpdateShiftTemplateData): Promise<ShiftTemplate> {
        const payload: Record<string, unknown> = {};
        if (data.name !== undefined) payload.name = data.name;
        if (data.startTime !== undefined) payload.start_time = data.startTime;
        if (data.endTime !== undefined) payload.end_time = data.endTime;
        if (data.isActive !== undefined) payload.is_active = data.isActive;

        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/users/shift-templates/${id}/`, payload);

        const updated =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        return this.normalizeShiftTemplate(updated);
    }

    async deleteShiftTemplate(id: number): Promise<void> {
        await apiClient.delete(`/users/shift-templates/${id}/`);
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

export const shiftService = new ShiftService();
