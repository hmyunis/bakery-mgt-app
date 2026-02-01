import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    shiftAssignmentService,
    type BulkCreateShiftAssignmentsData,
    type CreateShiftAssignmentData,
    type ShiftAssignmentsListParams,
    type UpdateShiftAssignmentData,
} from "../services/shiftAssignmentService";

export function useShiftAssignments(params: ShiftAssignmentsListParams = {}) {
    return useQuery({
        queryKey: ["shift-assignments", params],
        queryFn: () => shiftAssignmentService.getShiftAssignments(params),
    });
}

export function useBulkCreateShiftAssignments() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: BulkCreateShiftAssignmentsData) =>
            shiftAssignmentService.bulkCreateShiftAssignments(data),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
            toast.success(`Assignments created: ${res.createdCount}`);
        },
        onError: (error: unknown) => {
            toast.error(shiftAssignmentService.parseApiError(error));
        },
    });
}

export function useCreateShiftAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateShiftAssignmentData) =>
            shiftAssignmentService.createShiftAssignment(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
            toast.success("Shift assignment created");
        },
        onError: (error: unknown) => {
            toast.error(shiftAssignmentService.parseApiError(error));
        },
    });
}

export function useUpdateShiftAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateShiftAssignmentData }) =>
            shiftAssignmentService.updateShiftAssignment(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
            toast.success("Shift assignment updated");
        },
        onError: (error: unknown) => {
            toast.error(shiftAssignmentService.parseApiError(error));
        },
    });
}

export function useDeleteShiftAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => shiftAssignmentService.deleteShiftAssignment(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
            toast.success("Shift assignment deleted");
        },
        onError: (error: unknown) => {
            toast.error(shiftAssignmentService.parseApiError(error));
        },
    });
}
