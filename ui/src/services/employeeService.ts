import { apiClient } from "../lib/apiClient";
import type {
    DailyShiftAttendance,
    Employee,
    EmployeePrefill,
    PayrollDetail,
    PayrollRecord,
    UserSummary,
} from "../types/employee";
import type {
    ApiErrorResponse,
    ApiResponse,
    PaginatedResponse,
    WrappedPaginatedResponse,
} from "../types/api";

export interface EmployeesListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Employee[];
}

export interface EmployeesListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    user?: number | "";
    ordering?: string;
}

export interface CreateEmployeeData {
    userId?: number | null;
    fullName?: string;
    position: string;
    phoneNumber?: string;
    address?: string;
    hireDate: string;
    monthlyBaseSalary: number;
    paymentDetail?: string;
}

export interface UpdateEmployeeData {
    userId?: number | null;
    fullName?: string;
    position?: string;
    phoneNumber?: string;
    address?: string;
    hireDate?: string;
    monthlyBaseSalary?: number;
    paymentDetail?: string;
}

export interface PayrollSummaryResponse {
    records: PayrollRecord[];
    latestRecordId?: number | null;
    latest_record_id?: number | null;
}

export class EmployeeService {
    private normalizeDailyShiftAttendance(obj: Record<string, unknown>): DailyShiftAttendance {
        return {
            date: (obj.date as string) || "",
            shiftName: (obj.shiftName ?? obj.shift_name) as string | null,
            startTime: (obj.startTime ?? obj.start_time) as string | null,
            endTime: (obj.endTime ?? obj.end_time) as string | null,
            attendanceStatus: (obj.attendanceStatus ?? obj.attendance_status) as string | null,
            isOnLeave: Boolean(obj.isOnLeave ?? obj.is_on_leave ?? false),
            leaveType: (obj.leaveType ?? obj.leave_type) as string | null,
        };
    }

    private normalizeUserSummary(
        user: Record<string, unknown> | null | undefined
    ): UserSummary | null {
        if (!user) return null;
        return {
            id: user.id as number,
            username: user.username as string,
            fullName: (user.fullName || user.full_name) as string,
            phoneNumber: (user.phoneNumber || user.phone_number) as string,
            email: user.email as string,
            role: user.role as string,
        };
    }

    private normalizeEmployee(obj: Record<string, unknown>): Employee {
        const userSummary = this.normalizeUserSummary(
            (obj.user_summary || obj.userSummary) as Record<string, unknown> | null
        );

        return {
            id: obj.id as number,
            userId: (obj.userId ?? obj.user_id) as number | null | undefined,
            userSummary: userSummary,
            fullName: (obj.fullName || obj.full_name || "") as string,
            position: (obj.position || "") as string,
            phoneNumber: (obj.phoneNumber || obj.phone_number) as string,
            address: obj.address as string,
            hireDate: (obj.hireDate || obj.hire_date) as string,
            monthlyBaseSalary: parseFloat(
                (obj.monthlyBaseSalary || obj.monthly_base_salary || "0") as string
            ),
            paymentDetail: (obj.paymentDetail || obj.payment_detail) as string,
            createdAt: (obj.createdAt || obj.created_at) as string,
            updatedAt: (obj.updatedAt || obj.updated_at) as string,
        };
    }

    private normalizePayrollRecord(obj: Record<string, unknown>): PayrollRecord {
        return {
            id: obj.id as number,
            employee: obj.employee as number,
            employeeName: (obj.employeeName || obj.employee_name) as string,
            periodStart: (obj.periodStart || obj.period_start) as string,
            periodEnd: (obj.periodEnd || obj.period_end) as string,
            baseSalary: parseFloat((obj.baseSalary || obj.base_salary || "0") as string),
            amountPaid: parseFloat((obj.amountPaid || obj.amount_paid || "0") as string),
            status: obj.status as "paid" | "unpaid",
            paidAt: (obj.paidAt || obj.paid_at) as string | null,
            receipt: obj.receipt as string | null,
            notes: obj.notes as string | null,
            createdAt: (obj.createdAt || obj.created_at) as string,
            updatedAt: (obj.updatedAt || obj.updated_at) as string,
        };
    }

    private normalizePayrollDetail(obj: Record<string, unknown>): PayrollDetail {
        const record = (obj.payrollRecord || obj.payroll_record) as Record<string, unknown>;
        const attendanceSummary = (obj.attendanceSummary || obj.attendance_summary) as Record<
            string,
            unknown
        >;
        const leaveSummary = (obj.leaveSummary || obj.leave_summary || {}) as Record<
            string,
            number
        >;
        const waste = (obj.wasteSummary || obj.waste_summary) as Record<string, unknown>;
        const dailyCalendarRaw = ((obj.dailyCalendar || obj.daily_calendar) ?? []) as Record<
            string,
            unknown
        >[];
        return {
            payrollRecord: this.normalizePayrollRecord(record),
            attendanceSummary: {
                total: (attendanceSummary.total || 0) as number,
                statuses: (attendanceSummary.statuses ||
                    []) as PayrollDetail["attendanceSummary"]["statuses"],
            },
            leaveSummary: leaveSummary,
            wasteSummary: {
                totalWastageVolume: (waste.totalWastageVolume ||
                    waste.total_wastage_volume ||
                    0) as number,
                totalWastageValue: (waste.totalWastageValue ||
                    waste.total_wastage_value ||
                    0) as number,
            },
            paymentDetail: ((obj.paymentDetail ?? obj.payment_detail) as string) ?? null,
            dailyCalendar: dailyCalendarRaw.map((d) => this.normalizeDailyShiftAttendance(d)),
        };
    }

    async getEmployees(params: EmployeesListParams = {}): Promise<EmployeesListResponse> {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append("page", params.page.toString());
        if (params.pageSize) queryParams.append("page_size", params.pageSize.toString());
        if (params.search) queryParams.append("search", params.search);
        if (params.user !== undefined && params.user !== "")
            queryParams.append("user", params.user.toString());
        if (params.ordering) queryParams.append("ordering", params.ordering);

        const response = await apiClient.get<
            | WrappedPaginatedResponse<Record<string, unknown>>
            | PaginatedResponse<Record<string, unknown>>
            | Record<string, unknown>[]
        >(`/users/employees/?${queryParams.toString()}`);

        const data = response.data;

        if (data && !Array.isArray(data) && "data" in data && "pagination" in data) {
            const wrapped = data as WrappedPaginatedResponse<Record<string, unknown>>;
            return {
                count: wrapped.pagination.count || 0,
                next: wrapped.pagination.next || null,
                previous: wrapped.pagination.previous || null,
                results: (wrapped.data || []).map((x) => this.normalizeEmployee(x)),
            };
        }

        if (data && !Array.isArray(data) && "results" in data) {
            const paginated = data as PaginatedResponse<Record<string, unknown>>;
            return {
                ...paginated,
                results: (paginated.results || []).map((x) => this.normalizeEmployee(x)),
            };
        }

        if (Array.isArray(data)) {
            return {
                count: data.length,
                next: null,
                previous: null,
                results: data.map((x) => this.normalizeEmployee(x)),
            };
        }

        return { count: 0, next: null, previous: null, results: [] };
    }

    async getEmployee(id: number): Promise<Employee> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/users/employees/${id}/`);

        const payload =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        return this.normalizeEmployee(payload);
    }

    async createEmployee(data: CreateEmployeeData): Promise<Employee> {
        const payload: Record<string, unknown> = {
            user_id: data.userId ?? null,
            full_name: data.fullName,
            position: data.position,
            phone_number: data.phoneNumber,
            address: data.address,
            hire_date: data.hireDate,
            monthly_base_salary: data.monthlyBaseSalary,
            payment_detail: data.paymentDetail,
        };

        const response = await apiClient.post<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/users/employees/", payload);

        const created =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        return this.normalizeEmployee(created);
    }

    async updateEmployee(id: number, data: UpdateEmployeeData): Promise<Employee> {
        const payload: Record<string, unknown> = {};

        if (data.userId !== undefined) payload.user_id = data.userId;
        if (data.fullName !== undefined) payload.full_name = data.fullName;
        if (data.position !== undefined) payload.position = data.position;
        if (data.phoneNumber !== undefined) payload.phone_number = data.phoneNumber;
        if (data.address !== undefined) payload.address = data.address;
        if (data.hireDate !== undefined) payload.hire_date = data.hireDate;
        if (data.monthlyBaseSalary !== undefined)
            payload.monthly_base_salary = data.monthlyBaseSalary;
        if (data.paymentDetail !== undefined) payload.payment_detail = data.paymentDetail;

        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/users/employees/${id}/`, payload);

        const updated =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        return this.normalizeEmployee(updated);
    }

    async deleteEmployee(id: number): Promise<void> {
        await apiClient.delete(`/users/employees/${id}/`);
    }

    async prefillFromUser(userId: number): Promise<EmployeePrefill> {
        const response = await apiClient.get(`/users/employees/prefill/?user_id=${userId}`);
        const data = (response.data as Record<string, unknown>) || {};
        return {
            fullName: (data.fullName || data.full_name) as string,
            phoneNumber: (data.phoneNumber || data.phone_number) as string,
            address: data.address as string,
        };
    }

    async getPayrollSummary(employeeId: number): Promise<PayrollSummaryResponse> {
        const response = await apiClient.get(`/users/employees/${employeeId}/payroll_summary/`);
        const responseData = response.data as Record<string, unknown>;

        // Handle wrapped response format
        const data = (responseData.data as Record<string, unknown>) || responseData;

        const records = ((data.records || []) as Record<string, unknown>[]).map((r) =>
            this.normalizePayrollRecord(r)
        );
        return {
            records,
            latestRecordId: (data.latestRecordId || data.latest_record_id) as number | null,
        };
    }

    async getPayrollDetail(employeeId: number, recordId: number): Promise<PayrollDetail> {
        const response = await apiClient.get(
            `/users/employees/${employeeId}/payroll_detail/?record_id=${recordId}`
        );
        const responseData = response.data as Record<string, unknown>;

        // Handle wrapped response format
        const data = (responseData.data as Record<string, unknown>) || responseData;

        return this.normalizePayrollDetail(data);
    }

    async updatePayrollRecord(id: number, payload: FormData): Promise<PayrollRecord> {
        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >(`/users/payroll-records/${id}/`, payload, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        const updated =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        return this.normalizePayrollRecord(updated);
    }

    parseApiError(error: unknown): string {
        const e = error as { response?: { data?: ApiErrorResponse } };
        const d = e.response?.data;
        return (
            d?.message ||
            d?.detail ||
            (d?.errors && typeof d.errors === "object"
                ? (Object.values(d.errors)[0] as string)
                : null) ||
            "Request failed"
        );
    }
}

export const employeeService = new EmployeeService();
