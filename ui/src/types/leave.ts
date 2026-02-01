export type LeaveType = "sick" | "annual" | "holiday" | "other";

export interface LeaveRecord {
    id: number;
    employee: number;
    employeeName?: string;
    leaveType: LeaveType;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    dayCount: number;
    notes?: string | null;
    createdAt?: string;

    // Backend may return snake_case
    employee_name?: string;
    leave_type?: LeaveType;
    start_date?: string;
    end_date?: string;
    day_count?: number;
    created_at?: string;
}
