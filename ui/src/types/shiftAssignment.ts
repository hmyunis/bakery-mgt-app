export interface ShiftAssignment {
    id: number;
    employee: number;
    employeeName?: string;
    shift: number;
    shiftName?: string;
    shiftDate: string; // YYYY-MM-DD
    createdAt?: string;

    // Backend may return snake_case
    employee_name?: string;
    shift_name?: string;
    shift_date?: string;
    created_at?: string;
}
