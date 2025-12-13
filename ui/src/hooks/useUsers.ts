import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import {
  userService,
  type User,
  type CreateUserData,
  type UpdateUserData,
  type UsersListParams,
} from "../services/userService";
import { setSession } from "../store/authSlice";
import { useAppSelector } from "../store";

export function useUsers(params: UsersListParams = {}) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => userService.getUsers(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useUser(id: number | null) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => (id ? userService.getUser(id) : null),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserData) => userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      const errorMessage =
        errorData?.message ||
        errorData?.errors?.nonFieldErrors?.[0] ||
        errorData?.non_field_errors?.[0] ||
        Object.values(errorData?.errors || errorData || {})[0]?.[0] ||
        error.message ||
        "Failed to create user";
      toast.error(errorMessage);
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserData }) =>
      userService.updateUser(id, data),
    onSuccess: (updatedUser, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      
      // If the updated user is the current logged-in user, update the auth state
      if (currentUser && currentUser.id === updatedUser.id.toString()) {
        const fullName = updatedUser.fullName || "";
        
        dispatch(
          setSession({
            user: {
              id: updatedUser.id.toString(),
              name: fullName || updatedUser.username,
              email: updatedUser.email,
              avatar: updatedUser.avatar || undefined,
              role: updatedUser.role,
            },
          })
        );
      }
      
      toast.success("User updated successfully");
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      const errorMessage =
        errorData?.message ||
        errorData?.errors?.nonFieldErrors?.[0] ||
        errorData?.non_field_errors?.[0] ||
        Object.values(errorData?.errors || errorData || {})[0]?.[0] ||
        error.message ||
        "Failed to update user";
      toast.error(errorMessage);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => userService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted successfully");
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      const errorMessage =
        errorData?.message ||
        errorData?.detail ||
        error.message ||
        "Failed to delete user";
      toast.error(errorMessage);
    },
  });
}

