import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    leaveService,
    type CreateLeaveRecordData,
    type LeavesListParams,
    type UpdateLeaveRecordData,
} from "../services/leaveService";

export function useLeaves(params: LeavesListParams = {}) {
    return useQuery({
        queryKey: ["leaves", params],
        queryFn: () => leaveService.getLeaves(params),
    });
}

export function useCreateLeave() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateLeaveRecordData) => leaveService.createLeave(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leaves"] });
            toast.success("Leave record created");
        },
        onError: (error: unknown) => {
            toast.error(leaveService.parseApiError(error));
        },
    });
}

export function useUpdateLeave() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateLeaveRecordData }) =>
            leaveService.updateLeave(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leaves"] });
            toast.success("Leave record updated");
        },
        onError: (error: unknown) => {
            toast.error(leaveService.parseApiError(error));
        },
    });
}

export function useDeleteLeave() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => leaveService.deleteLeave(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leaves"] });
            toast.success("Leave record deleted");
        },
        onError: (error: unknown) => {
            toast.error(leaveService.parseApiError(error));
        },
    });
}
