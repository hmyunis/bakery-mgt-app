import { apiClient } from "../lib/apiClient";
import type { BakerySettings } from "../types/bakery";
import type { ApiResponse } from "../types/api";

interface BakerySettingsResponse extends Partial<BakerySettings> {
    id: number;
    logo_url?: string | null;
    phone_number?: string;
    facebook_enabled?: boolean;
    facebook_url?: string;
    instagram_enabled?: boolean;
    instagram_url?: string;
    telegram_enabled?: boolean;
    telegram_url?: string;
    tiktok_enabled?: boolean;
    tiktok_url?: string;
    youtube_enabled?: boolean;
    youtube_url?: string;
    x_enabled?: boolean;
    x_url?: string;
    theme_color?: string;
    created_at?: string;
    updated_at?: string;
}

class BakeryService {
    async getBakerySettings(): Promise<BakerySettings> {
        const response = await apiClient.get<
            ApiResponse<BakerySettingsResponse> | BakerySettingsResponse
        >("/core/bakery-settings/");
        const data =
            (response.data as ApiResponse<BakerySettingsResponse>).data ??
            (response.data as BakerySettingsResponse);

        return {
            id: Number(data.id),
            name: data.name ?? "Bakery",
            logo: data.logo ?? null,
            logoUrl: data.logoUrl ?? data.logo_url ?? null,
            phoneNumber: data.phoneNumber ?? data.phone_number ?? "",
            address: data.address ?? "",
            email: data.email ?? "",
            facebookEnabled: Boolean(data.facebookEnabled ?? data.facebook_enabled ?? false),
            facebookUrl: (data.facebookUrl ?? data.facebook_url ?? "") as string,
            instagramEnabled: Boolean(data.instagramEnabled ?? data.instagram_enabled ?? false),
            instagramUrl: (data.instagramUrl ?? data.instagram_url ?? "") as string,
            telegramEnabled: Boolean(data.telegramEnabled ?? data.telegram_enabled ?? false),
            telegramUrl: (data.telegramUrl ?? data.telegram_url ?? "") as string,
            tiktokEnabled: Boolean(data.tiktokEnabled ?? data.tiktok_enabled ?? false),
            tiktokUrl: (data.tiktokUrl ?? data.tiktok_url ?? "") as string,
            youtubeEnabled: Boolean(data.youtubeEnabled ?? data.youtube_enabled ?? false),
            youtubeUrl: (data.youtubeUrl ?? data.youtube_url ?? "") as string,
            xEnabled: Boolean(data.xEnabled ?? data.x_enabled ?? false),
            xUrl: (data.xUrl ?? data.x_url ?? "") as string,
            themeColor: data.themeColor ?? data.theme_color ?? "#f2751a",
            createdAt: (data.createdAt ?? data.created_at) as string,
            updatedAt: (data.updatedAt ?? data.updated_at) as string,
        };
    }

    async updateBakerySettings(formData: FormData): Promise<BakerySettings> {
        const response = await apiClient.patch<
            ApiResponse<BakerySettingsResponse> | BakerySettingsResponse
        >("/core/bakery-settings/", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        const data =
            (response.data as ApiResponse<BakerySettingsResponse>).data ??
            (response.data as BakerySettingsResponse);

        return {
            id: Number(data.id),
            name: data.name ?? "Bakery",
            logo: data.logo ?? null,
            logoUrl: data.logoUrl ?? data.logo_url ?? null,
            phoneNumber: data.phoneNumber ?? data.phone_number ?? "",
            address: data.address ?? "",
            email: data.email ?? "",
            facebookEnabled: Boolean(data.facebookEnabled ?? data.facebook_enabled ?? false),
            facebookUrl: (data.facebookUrl ?? data.facebook_url ?? "") as string,
            instagramEnabled: Boolean(data.instagramEnabled ?? data.instagram_enabled ?? false),
            instagramUrl: (data.instagramUrl ?? data.instagram_url ?? "") as string,
            telegramEnabled: Boolean(data.telegramEnabled ?? data.telegram_enabled ?? false),
            telegramUrl: (data.telegramUrl ?? data.telegram_url ?? "") as string,
            tiktokEnabled: Boolean(data.tiktokEnabled ?? data.tiktok_enabled ?? false),
            tiktokUrl: (data.tiktokUrl ?? data.tiktok_url ?? "") as string,
            youtubeEnabled: Boolean(data.youtubeEnabled ?? data.youtube_enabled ?? false),
            youtubeUrl: (data.youtubeUrl ?? data.youtube_url ?? "") as string,
            xEnabled: Boolean(data.xEnabled ?? data.x_enabled ?? false),
            xUrl: (data.xUrl ?? data.x_url ?? "") as string,
            themeColor: data.themeColor ?? data.theme_color ?? "#f2751a",
            createdAt: (data.createdAt ?? data.created_at) as string,
            updatedAt: (data.updatedAt ?? data.updated_at) as string,
        };
    }
}

export const bakeryService = new BakeryService();
