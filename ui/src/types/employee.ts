export interface UserSummary {
    id: number;
    username: string;
    fullName?: string;
    phoneNumber?: string;
    email?: string;
    role?: string;
    full_name?: string;
    phone_number?: string;
}

export interface Employee {
    id: number;
    userId?: number | null;
    userSummary?: UserSummary | null;
    fullName: string;
    position: string;
    phoneNumber?: string;
    address?: string;
    hireDate: string;
    monthlyBaseSalary: number;
    paymentDetail?: string;
    createdAt?: string;
    updatedAt?: string;
    full_name?: string;
    phone_number?: string;
    hire_date?: string;
    monthly_base_salary?: number;
    payment_detail?: string;
}

export interface PayrollRecord {
    id: number;
    employee: number;
    employeeName?: string;
    periodStart: string;
    periodEnd: string;
    baseSalary: number;
    amountPaid: number;
    status: "paid" | "unpaid";
    paidAt?: string | null;
    receipt?: string | null;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
    period_start?: string;
    period_end?: string;
    base_salary?: number;
    amount_paid?: number;
    paid_at?: string;
}

export interface DailyShiftAttendance {
    date: string; // YYYY-MM-DD
    shiftName: string | null;
    startTime: string | null; // HH:MM:SS
    endTime: string | null; // HH:MM:SS
    attendanceStatus: string | null;
    isOnLeave: boolean;
    leaveType: string | null;
}

export interface PayrollDetail {
    payrollRecord: PayrollRecord;
    attendanceSummary: {
        total: number;
        statuses: Array<{
            status: string;
            count: number;
            totalLate?: number | null;
            totalOvertime?: number | null;
            total_late?: number | null;
            total_overtime?: number | null;
        }>;
    };
    leaveSummary: Record<string, number>;
    wasteSummary: {
        totalWastageVolume: number;
        totalWastageValue: number;
        total_wastage_volume?: number;
        total_wastage_value?: number;
    };
    paymentDetail?: string | null;
    dailyCalendar: DailyShiftAttendance[];
}

export interface EmployeePrefill {
    fullName?: string | null;
    phoneNumber?: string | null;
    address?: string | null;
}
