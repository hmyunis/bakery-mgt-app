import { apiClient } from "../lib/apiClient";
import { type UserRole } from "../constants/roles";

export interface User {
    id: number;
    username: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    role: UserRole;
    address?: string;
    avatar?: string;
    dateJoined?: string;
    lastLogin?: string;
    isActive?: boolean;
    // Backend may return camelCase or snake_case
    full_name?: string;
    phone_number?: string;
    date_joined?: string;
    last_login?: string;
    is_active?: boolean;
}

export interface CreateUserData {
    username: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    role: UserRole;
    address?: string;
    password: string;
    confirmPassword: string;
    avatar?: File;
}

export interface UpdateUserData {
    username?: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    role?: UserRole;
    address?: string;
    password?: string;
    confirmPassword?: string;
    avatar?: File | null; // null means remove avatar
    isActive?: boolean;
}

export interface UsersListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: User[];
}

export interface UsersListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: UserRole | "";
    isActive?: boolean | "";
    ordering?: string;
}

class UserService {
    /**
     * Get list of users with pagination and filters
     */
    async getUsers(params: UsersListParams = {}): Promise<UsersListResponse> {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append("page", params.page.toString());
        if (params.pageSize) queryParams.append("page_size", params.pageSize.toString());
        if (params.search) queryParams.append("search", params.search);
        if (params.role) queryParams.append("role", params.role);
        if (params.isActive !== undefined && params.isActive !== "") {
            queryParams.append("is_active", params.isActive.toString());
        }
        if (params.ordering) queryParams.append("ordering", params.ordering);

        const response = await apiClient.get<any>(`/users/?${queryParams.toString()}`);

        // Handle wrapped response format: { success, message, data: [...], pagination: {...} }
        if (response.data && "data" in response.data && "pagination" in response.data) {
            const pagination = response.data.pagination;
            const results = (response.data.data || []).map((user: any) => this.normalizeUser(user));
            return {
                count: pagination.count || 0,
                next: pagination.next || null,
                previous: pagination.previous || null,
                results,
            };
        }

        // Handle direct paginated response: { count, next, previous, results }
        if (response.data && "results" in response.data) {
            return {
                ...response.data,
                results: (response.data.results || []).map((user: any) => this.normalizeUser(user)),
            };
        }

        // Fallback: assume it's the data array directly
        return {
            count: Array.isArray(response.data) ? response.data.length : 0,
            next: null,
            previous: null,
            results: Array.isArray(response.data)
                ? response.data.map((user: any) => this.normalizeUser(user))
                : [],
        };
    }

    /**
     * Get a single user by ID
     */
    async getUser(id: number): Promise<User> {
        const response = await apiClient.get<any>(`/users/${id}/`);

        // Handle wrapped response format: { success, message, data: {...} }
        const user = response.data?.data || response.data;

        // Normalize field names (handle both camelCase and snake_case)
        return this.normalizeUser(user);
    }

    /**
     * Normalize user object to handle both camelCase and snake_case from backend
     */
    private normalizeUser(user: any): User {
        if (!user) return user;

        return {
            id: user.id,
            username: user.username,
            fullName: user.fullName || user.full_name,
            email: user.email,
            phoneNumber: user.phoneNumber || user.phone_number,
            role: user.role,
            address: user.address,
            avatar: user.avatar,
            dateJoined: user.dateJoined || user.date_joined,
            lastLogin: user.lastLogin || user.last_login,
            isActive: user.isActive !== undefined ? user.isActive : user.is_active,
        };
    }

    /**
     * Create a new user
     */
    async createUser(data: CreateUserData): Promise<User> {
        const formData = new FormData();

        formData.append("username", data.username);
        if (data.fullName) formData.append("full_name", data.fullName);
        if (data.email) formData.append("email", data.email);
        if (data.phoneNumber) formData.append("phone_number", data.phoneNumber);
        formData.append("role", data.role);
        if (data.address) formData.append("address", data.address);
        formData.append("password", data.password);
        formData.append("confirm_password", data.confirmPassword);
        if (data.avatar) formData.append("avatar", data.avatar);

        const response = await apiClient.post<any>("/users/", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        // Handle wrapped response format: { success, message, data: {...} }
        const user = response.data?.data || response.data;
        return this.normalizeUser(user);
    }

    /**
     * Update an existing user
     */
    async updateUser(id: number, data: UpdateUserData): Promise<User> {
        const formData = new FormData();

        if (data.username !== undefined) formData.append("username", data.username);
        if (data.fullName !== undefined) formData.append("full_name", data.fullName || "");
        if (data.email !== undefined) formData.append("email", data.email || "");
        if (data.phoneNumber !== undefined) formData.append("phone_number", data.phoneNumber || "");
        if (data.role !== undefined) formData.append("role", data.role);
        if (data.address !== undefined) formData.append("address", data.address || "");
        if (data.isActive !== undefined) formData.append("is_active", data.isActive.toString());
        if (data.password) {
            formData.append("password", data.password);
            if (data.confirmPassword) {
                formData.append("confirm_password", data.confirmPassword);
            }
        }

        // Handle avatar: File = upload, null = remove, undefined = keep current
        if (data.avatar !== undefined) {
            if (data.avatar === null) {
                // To clear a FileField, send a flag instead of binary data
                formData.append("avatar_clear", "true");
            } else if (data.avatar instanceof File) {
                formData.append("avatar", data.avatar);
            }
        }

        const response = await apiClient.patch<any>(`/users/${id}/`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        // Handle wrapped response format: { success, message, data: {...} }
        const user = response.data?.data || response.data;
        return this.normalizeUser(user);
    }

    /**
     * Delete a user
     */
    async deleteUser(id: number): Promise<void> {
        await apiClient.delete(`/users/${id}/`);
    }
}

export const userService = new UserService();
