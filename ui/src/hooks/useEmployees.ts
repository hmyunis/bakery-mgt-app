import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    employeeService,
    type CreateEmployeeData,
    type EmployeesListParams,
    type UpdateEmployeeData,
} from "../services/employeeService";

export function useEmployees(params: EmployeesListParams = {}) {
    return useQuery({
        queryKey: ["employees", params],
        queryFn: () => employeeService.getEmployees(params),
    });
}

export function useEmployee(id: number | null) {
    return useQuery({
        queryKey: ["employees", id],
        queryFn: () => (id ? employeeService.getEmployee(id) : null),
        enabled: !!id,
    });
}

export function useCreateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateEmployeeData) => employeeService.createEmployee(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["employees"] });
            toast.success("Employee created successfully");
        },
        onError: (error: unknown) => {
            toast.error(employeeService.parseApiError(error));
        },
    });
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateEmployeeData }) =>
            employeeService.updateEmployee(id, data),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ["employees"] });
            queryClient.invalidateQueries({ queryKey: ["employees", updated.id] });
            toast.success("Employee updated successfully");
        },
        onError: (error: unknown) => {
            toast.error(employeeService.parseApiError(error));
        },
    });
}

export function useDeleteEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => employeeService.deleteEmployee(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["employees"] });
            toast.success("Employee deleted successfully");
        },
        onError: (error: unknown) => {
            toast.error(employeeService.parseApiError(error));
        },
    });
}

export function useEmployeePrefill(userId: number | null, enabled = true) {
    return useQuery({
        queryKey: ["employees", "prefill", userId],
        queryFn: () => (userId ? employeeService.prefillFromUser(userId) : null),
        enabled: enabled && !!userId,
        staleTime: 0,
    });
}

export function usePayrollSummary(employeeId: number | null) {
    return useQuery({
        queryKey: ["employees", employeeId, "payroll_summary"],
        queryFn: () => (employeeId ? employeeService.getPayrollSummary(employeeId) : null),
        enabled: !!employeeId,
    });
}

export function usePayrollDetail(
    employeeId: number | null,
    recordId: number | null,
    enabled: boolean
) {
    return useQuery({
        queryKey: ["employees", employeeId, "payroll_detail", recordId],
        queryFn: () => {
            if (!employeeId || !recordId) return null;
            return employeeService.getPayrollDetail(employeeId, recordId);
        },
        enabled: enabled && !!employeeId && !!recordId,
    });
}

export function useUpdatePayrollRecord() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: FormData }) =>
            employeeService.updatePayrollRecord(id, data),
        onSuccess: (_updated, vars) => {
            queryClient.invalidateQueries({ queryKey: ["employees"] });
            queryClient.invalidateQueries({ queryKey: ["payroll-records", vars.id] });
            toast.success("Payroll record updated");
        },
        onError: (error: unknown) => {
            toast.error(employeeService.parseApiError(error));
        },
    });
}
