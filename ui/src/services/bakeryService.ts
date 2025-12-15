import { apiClient } from "../lib/apiClient";
import type { BakerySettings } from "../types/bakery";

class BakeryService {
    async getBakerySettings(): Promise<BakerySettings> {
        const response = await apiClient.get<any>("/core/bakery-settings/");
        const data = response.data?.data ?? response.data;

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
            createdAt: data.createdAt ?? data.created_at,
            updatedAt: data.updatedAt ?? data.updated_at,
        };
    }

    async updateBakerySettings(formData: FormData): Promise<BakerySettings> {
        const response = await apiClient.patch<any>("/core/bakery-settings/", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        const data = response.data?.data ?? response.data;

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
            createdAt: data.createdAt ?? data.created_at,
            updatedAt: data.updatedAt ?? data.updated_at,
        };
    }
}

export const bakeryService = new BakeryService();
