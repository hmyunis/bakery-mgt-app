import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    attendanceService,
    type AttendanceListParams,
    type AttendanceUpsertData,
    type UpdateAttendanceRecordData,
} from "../services/attendanceService";

export function useAttendance(params: AttendanceListParams = {}) {
    return useQuery({
        queryKey: ["attendance", params],
        queryFn: () => attendanceService.getAttendance(params),
    });
}

export function useAttendanceDailySummary(dateStr: string | null) {
    return useQuery({
        queryKey: ["attendance", "daily_summary", dateStr],
        queryFn: () => (dateStr ? attendanceService.getDailySummary(dateStr) : null),
        enabled: !!dateStr,
    });
}

export function useUpsertAttendance() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: AttendanceUpsertData) => attendanceService.upsertAttendance(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["attendance"] });
            toast.success("Attendance saved");
        },
        onError: (error: unknown) => {
            toast.error(attendanceService.parseApiError(error));
        },
    });
}

export function useUpdateAttendanceRecord() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateAttendanceRecordData }) =>
            attendanceService.updateAttendanceRecord(id, data),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ["attendance"] });
            queryClient.invalidateQueries({ queryKey: ["attendance", updated.id] });
            toast.success("Attendance updated");
        },
        onError: (error: unknown) => {
            toast.error(attendanceService.parseApiError(error));
        },
    });
}

export function useDeleteAttendanceRecord() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => attendanceService.deleteAttendanceRecord(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["attendance"] });
            toast.success("Attendance deleted");
        },
        onError: (error: unknown) => {
            toast.error(attendanceService.parseApiError(error));
        },
    });
}
