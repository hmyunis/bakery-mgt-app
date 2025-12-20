export interface ApiResponse<T> {
    data: T;
    message?: string;
    success?: boolean;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface WrappedPaginatedResponse<T> {
    data: T[];
    pagination: {
        count: number;
        next: string | null;
        previous: string | null;
        page: number;
        page_size: number;
    };
}

export interface ApiErrorResponse {
    message?: string;
    detail?: string;
    errors?: Record<string, unknown>;
    non_field_errors?: string[];
    nonFieldErrors?: string[];
    [key: string]: unknown;
}

export interface ApiError {
    message: string;
    response?: {
        data?: ApiErrorResponse;
        status?: number;
    };
}
