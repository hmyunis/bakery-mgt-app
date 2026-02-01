export interface ShiftTemplate {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;

    // Backend may return snake_case
    start_time?: string;
    end_time?: string;
    is_active?: boolean;
}
