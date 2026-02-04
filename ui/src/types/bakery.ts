export interface BakerySettings {
    id: number;
    name: string;
    logo: string | null;
    logoUrl: string | null;
    phoneNumber: string;
    address: string;
    email: string;
    facebookEnabled: boolean;
    facebookUrl: string;
    instagramEnabled: boolean;
    instagramUrl: string;
    telegramEnabled: boolean;
    telegramUrl: string;
    tiktokEnabled: boolean;
    tiktokUrl: string;
    youtubeEnabled: boolean;
    youtubeUrl: string;
    xEnabled: boolean;
    xUrl: string;
    themeColor: string;
    syncSalesToBankAccounts: boolean;
    createdAt: string;
    updatedAt: string;
}
