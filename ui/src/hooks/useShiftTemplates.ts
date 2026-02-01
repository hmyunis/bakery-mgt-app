import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    shiftService,
    type CreateShiftTemplateData,
    type ShiftTemplatesListParams,
    type UpdateShiftTemplateData,
} from "../services/shiftService";

export function useShiftTemplates(params: ShiftTemplatesListParams = {}) {
    return useQuery({
        queryKey: ["shift-templates", params],
        queryFn: () => shiftService.getShiftTemplates(params),
    });
}

export function useCreateShiftTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateShiftTemplateData) => shiftService.createShiftTemplate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shift-templates"] });
            toast.success("Shift template created");
        },
        onError: (error: unknown) => {
            toast.error(shiftService.parseApiError(error));
        },
    });
}

export function useUpdateShiftTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateShiftTemplateData }) =>
            shiftService.updateShiftTemplate(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shift-templates"] });
            toast.success("Shift template updated");
        },
        onError: (error: unknown) => {
            toast.error(shiftService.parseApiError(error));
        },
    });
}

export function useDeleteShiftTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => shiftService.deleteShiftTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shift-templates"] });
            toast.success("Shift template deleted");
        },
        onError: (error: unknown) => {
            toast.error(shiftService.parseApiError(error));
        },
    });
}
