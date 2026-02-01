export type AttendanceStatus = "present" | "late" | "absent" | "overtime";

export interface AttendanceRecord {
    id: number;
    assignment: number;
    employeeName?: string;
    shiftName?: string;
    shiftDate?: string;
    status: AttendanceStatus;
    lateMinutes: number;
    overtimeMinutes: number;
    recordedAt?: string;
    notes?: string | null;

    // Backend may return snake_case
    employee_name?: string;
    shift_name?: string;
    shift_date?: string;
    late_minutes?: number;
    overtime_minutes?: number;
    recorded_at?: string;
}

export interface AttendanceDailySummary {
    date: string;
    totalRecords: number;
    totalScheduledMinutes: number;
    totalWorkedMinutes: number;
    statusBreakdown: Array<{
        status: AttendanceStatus;
        count: number;
        total_late?: number | null;
        total_overtime?: number | null;
        totalLate?: number | null;
        totalOvertime?: number | null;
    }>;

    // Backend may return snake_case
    total_records?: number;
    total_scheduled_minutes?: number;
    total_worked_minutes?: number;
    status_breakdown?: AttendanceDailySummary["statusBreakdown"];
}
