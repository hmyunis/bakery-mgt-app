import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { userService } from "../services/userService";
import type { CreateUserData, UpdateUserData, UsersListParams } from "../services/userService";
import type { ApiError, ApiErrorResponse } from "../types/api";
import { setSession } from "../store/authSlice";
import { useAppSelector } from "../store";

/**
 * Hook to fetch users with pagination and filters
 */
export function useUsers(params: UsersListParams = {}) {
    return useQuery({
        queryKey: ["users", params],
        queryFn: () => userService.getUsers(params),
    });
}

/**
 * Hook to fetch a single user by ID
 */
export function useUser(id: number | null) {
    return useQuery({
        queryKey: ["users", id],
        queryFn: () => (id ? userService.getUser(id) : null),
        enabled: !!id,
    });
}

/**
 * Hook to create a new user
 */
export function useCreateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateUserData) => userService.createUser(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("User created successfully");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorData = apiError.response?.data as ApiErrorResponse;
            const errorMessage =
                errorData?.message ||
                errorData?.detail ||
                (errorData?.errors && typeof errorData.errors === "object"
                    ? Object.values(errorData.errors)[0]
                    : null) ||
                "Failed to create user";
            toast.error(errorMessage as string);
        },
    });
}

/**
 * Hook to update an existing user
 */
export function useUpdateUser() {
    const queryClient = useQueryClient();
    const currentUser = useAppSelector((state) => state.auth.user);

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateUserData }) =>
            userService.updateUser(id, data),
        onSuccess: (updatedUser) => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["users", updatedUser.id] });

            // If the updated user is the current user, update the session
            if (currentUser && updatedUser.id === currentUser.id) {
                setSession({ user: updatedUser });
            }

            toast.success("User updated successfully");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorData = apiError.response?.data as ApiErrorResponse;
            const errorMessage =
                errorData?.message ||
                errorData?.detail ||
                (errorData?.errors && typeof errorData.errors === "object"
                    ? Object.values(errorData.errors)[0]
                    : null) ||
                "Failed to update user";
            toast.error(errorMessage as string);
        },
    });
}

/**
 * Hook to delete a user
 */
export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => userService.deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("User deleted successfully");
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const errorData = apiError.response?.data as ApiErrorResponse;
            const errorMessage = errorData?.message || errorData?.detail || "Failed to delete user";
            toast.error(errorMessage);
        },
    });
}
