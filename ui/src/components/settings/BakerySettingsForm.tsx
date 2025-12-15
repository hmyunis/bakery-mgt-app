import { useState, useEffect } from "react";
import { Button, Input, Textarea, Spinner, Switch, Divider } from "@heroui/react";
import { Save, Upload, X, Facebook, Instagram, Send, Youtube, Twitter, Music2 } from "lucide-react";
import { useBakerySettings, useUpdateBakerySettings } from "../../hooks/useBakery";
import { toast } from "sonner";

export function BakerySettingsForm() {
    const { data: bakerySettings, isLoading } = useBakerySettings();
    const { mutateAsync: updateSettings, isPending } = useUpdateBakerySettings();

    const [formData, setFormData] = useState({
        name: "",
        phoneNumber: "",
        address: "",
        email: "",
        themeColor: "#f2751a",
        facebookUrl: "",
        facebookEnabled: false,
        instagramUrl: "",
        instagramEnabled: false,
        telegramUrl: "",
        telegramEnabled: false,
        tiktokUrl: "",
        tiktokEnabled: false,
        youtubeUrl: "",
        youtubeEnabled: false,
        xUrl: "",
        xEnabled: false,
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    useEffect(() => {
        if (bakerySettings) {
            setFormData({
                name: bakerySettings.name || "",
                phoneNumber: bakerySettings.phoneNumber || "",
                address: bakerySettings.address || "",
                email: bakerySettings.email || "",
                themeColor: bakerySettings.themeColor || "#06b6d4",
                facebookUrl: bakerySettings.facebookUrl || "",
                facebookEnabled: Boolean(bakerySettings.facebookEnabled),
                instagramUrl: bakerySettings.instagramUrl || "",
                instagramEnabled: Boolean(bakerySettings.instagramEnabled),
                telegramUrl: bakerySettings.telegramUrl || "",
                telegramEnabled: Boolean(bakerySettings.telegramEnabled),
                tiktokUrl: bakerySettings.tiktokUrl || "",
                tiktokEnabled: Boolean(bakerySettings.tiktokEnabled),
                youtubeUrl: bakerySettings.youtubeUrl || "",
                youtubeEnabled: Boolean(bakerySettings.youtubeEnabled),
                xUrl: bakerySettings.xUrl || "",
                xEnabled: Boolean(bakerySettings.xEnabled),
            });
            setLogoPreview(bakerySettings.logoUrl);
        }
    }, [bakerySettings]);

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value as any }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith("image/")) {
                toast.error("Please select an image file");
                return;
            }
            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image size must be less than 5MB");
                return;
            }
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogoFile(null);
        setLogoPreview(bakerySettings?.logoUrl || null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const formDataToSend = new FormData();
        formDataToSend.append("name", formData.name);
        formDataToSend.append("phone_number", formData.phoneNumber);
        formDataToSend.append("address", formData.address);
        formDataToSend.append("email", formData.email);
        formDataToSend.append("theme_color", formData.themeColor);
        formDataToSend.append("facebook_url", formData.facebookUrl);
        formDataToSend.append("facebook_enabled", String(formData.facebookEnabled));
        formDataToSend.append("instagram_url", formData.instagramUrl);
        formDataToSend.append("instagram_enabled", String(formData.instagramEnabled));
        formDataToSend.append("telegram_url", formData.telegramUrl);
        formDataToSend.append("telegram_enabled", String(formData.telegramEnabled));
        formDataToSend.append("tiktok_url", formData.tiktokUrl);
        formDataToSend.append("tiktok_enabled", String(formData.tiktokEnabled));
        formDataToSend.append("youtube_url", formData.youtubeUrl);
        formDataToSend.append("youtube_enabled", String(formData.youtubeEnabled));
        formDataToSend.append("x_url", formData.xUrl);
        formDataToSend.append("x_enabled", String(formData.xEnabled));

        if (logoFile) {
            formDataToSend.append("logo", logoFile);
        }

        await updateSettings(formDataToSend);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                {/* Logo Upload */}
                <div>
                    <label className="block text-sm font-medium text-[var(--fg)] mb-2">
                        Logo
                    </label>
                    <div className="flex items-center gap-4">
                        {logoPreview && (
                            <div className="relative">
                                <img
                                    src={logoPreview}
                                    alt="Logo preview"
                                    className="w-24 h-24 object-contain rounded-lg border border-slate-200 dark:border-slate-700"
                                />
                                {logoFile && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveLogo}
                                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="flex-1">
                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="bordered"
                                    startContent={<Upload className="h-4 w-4" />}
                                    as="span"
                                >
                                    {logoPreview ? "Change Logo" : "Upload Logo"}
                                </Button>
                            </label>
                            <p className="text-xs text-[var(--muted)] mt-1">
                                JPEG, PNG, GIF, or WebP. Max 5MB.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Name */}
                <Input
                    label="Bakery Name"
                    placeholder="Enter bakery name"
                    value={formData.name}
                    onValueChange={(value) => handleInputChange("name", value)}
                    classNames={{
                        input: "!text-slate-900 dark:!text-slate-100",
                        label: "!text-slate-700 dark:!text-slate-300",
                    }}
                />

                {/* Phone Number */}
                <Input
                    label="Phone Number"
                    placeholder="Enter phone number"
                    value={formData.phoneNumber}
                    onValueChange={(value) => handleInputChange("phoneNumber", value)}
                    classNames={{
                        input: "!text-slate-900 dark:!text-slate-100",
                        label: "!text-slate-700 dark:!text-slate-300",
                    }}
                />

                {/* Email */}
                <Input
                    label="Email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onValueChange={(value) => handleInputChange("email", value)}
                    classNames={{
                        input: "!text-slate-900 dark:!text-slate-100",
                        label: "!text-slate-700 dark:!text-slate-300",
                    }}
                />

                {/* Address */}
                <Textarea
                    label="Address"
                    placeholder="Enter bakery address"
                    value={formData.address}
                    onValueChange={(value) => handleInputChange("address", value)}
                    minRows={3}
                    classNames={{
                        input: "!text-slate-900 dark:!text-slate-100",
                        label: "!text-slate-700 dark:!text-slate-300",
                    }}
                />

                {/* Theme Color */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--fg)]">
                        Theme Color
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={formData.themeColor}
                            onChange={(e) => handleInputChange("themeColor", e.target.value)}
                            className="h-10 w-20 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                        />
                        <Input
                            placeholder="#f2751a"
                            value={formData.themeColor}
                            onValueChange={(value) => handleInputChange("themeColor", value)}
                            pattern="^#[0-9A-Fa-f]{6}$"
                            classNames={{
                                input: "!text-slate-900 dark:!text-slate-100 font-mono",
                                label: "!text-slate-700 dark:!text-slate-300",
                            }}
                        />
                        <div
                            className="h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                            style={{ backgroundColor: formData.themeColor }}
                            title="Preview"
                        />
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                        Choose the accent color for the public landing page.
                    </p>
                </div>

                <Divider className="my-2" />

                <div className="space-y-3">
                    <div className="text-sm font-medium text-[var(--fg)]">Social Media</div>
                    <p className="text-xs text-[var(--muted)]">
                        To show a social icon on the website footer, provide a URL then enable it.
                    </p>

                    {/* Facebook */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                        <Input
                            label="Facebook URL"
                            placeholder="https://facebook.com/yourpage"
                            value={formData.facebookUrl}
                            onValueChange={(value) => handleInputChange("facebookUrl", value)}
                            startContent={<Facebook className="h-4 w-4 text-default-400" />}
                            classNames={{
                                input: "!text-slate-900 dark:!text-slate-100",
                                label: "!text-slate-700 dark:!text-slate-300",
                            }}
                        />
                        <Switch
                            aria-label="Enable Facebook"
                            isSelected={formData.facebookEnabled}
                            isDisabled={!formData.facebookUrl.trim()}
                            onValueChange={(v) => handleInputChange("facebookEnabled", v)}
                        >
                            Enabled
                        </Switch>
                    </div>

                    {/* Instagram */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                        <Input
                            label="Instagram URL"
                            placeholder="https://instagram.com/yourhandle"
                            value={formData.instagramUrl}
                            onValueChange={(value) => handleInputChange("instagramUrl", value)}
                            startContent={<Instagram className="h-4 w-4 text-default-400" />}
                            classNames={{
                                input: "!text-slate-900 dark:!text-slate-100",
                                label: "!text-slate-700 dark:!text-slate-300",
                            }}
                        />
                        <Switch
                            aria-label="Enable Instagram"
                            isSelected={formData.instagramEnabled}
                            isDisabled={!formData.instagramUrl.trim()}
                            onValueChange={(v) => handleInputChange("instagramEnabled", v)}
                        >
                            Enabled
                        </Switch>
                    </div>

                    {/* Telegram */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                        <Input
                            label="Telegram URL"
                            placeholder="https://t.me/yourchannel"
                            value={formData.telegramUrl}
                            onValueChange={(value) => handleInputChange("telegramUrl", value)}
                            startContent={<Send className="h-4 w-4 text-default-400" />}
                            classNames={{
                                input: "!text-slate-900 dark:!text-slate-100",
                                label: "!text-slate-700 dark:!text-slate-300",
                            }}
                        />
                        <Switch
                            aria-label="Enable Telegram"
                            isSelected={formData.telegramEnabled}
                            isDisabled={!formData.telegramUrl.trim()}
                            onValueChange={(v) => handleInputChange("telegramEnabled", v)}
                        >
                            Enabled
                        </Switch>
                    </div>

                    {/* TikTok */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                        <Input
                            label="TikTok URL"
                            placeholder="https://tiktok.com/@yourhandle"
                            value={formData.tiktokUrl}
                            onValueChange={(value) => handleInputChange("tiktokUrl", value)}
                            startContent={<Music2 className="h-4 w-4 text-default-400" />}
                            classNames={{
                                input: "!text-slate-900 dark:!text-slate-100",
                                label: "!text-slate-700 dark:!text-slate-300",
                            }}
                        />
                        <Switch
                            aria-label="Enable TikTok"
                            isSelected={formData.tiktokEnabled}
                            isDisabled={!formData.tiktokUrl.trim()}
                            onValueChange={(v) => handleInputChange("tiktokEnabled", v)}
                        >
                            Enabled
                        </Switch>
                    </div>

                    {/* YouTube */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                        <Input
                            label="YouTube URL"
                            placeholder="https://youtube.com/@yourchannel"
                            value={formData.youtubeUrl}
                            onValueChange={(value) => handleInputChange("youtubeUrl", value)}
                            startContent={<Youtube className="h-4 w-4 text-default-400" />}
                            classNames={{
                                input: "!text-slate-900 dark:!text-slate-100",
                                label: "!text-slate-700 dark:!text-slate-300",
                            }}
                        />
                        <Switch
                            aria-label="Enable YouTube"
                            isSelected={formData.youtubeEnabled}
                            isDisabled={!formData.youtubeUrl.trim()}
                            onValueChange={(v) => handleInputChange("youtubeEnabled", v)}
                        >
                            Enabled
                        </Switch>
                    </div>

                    {/* X */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                        <Input
                            label="X (Twitter) URL"
                            placeholder="https://x.com/yourhandle"
                            value={formData.xUrl}
                            onValueChange={(value) => handleInputChange("xUrl", value)}
                            startContent={<Twitter className="h-4 w-4 text-default-400" />}
                            classNames={{
                                input: "!text-slate-900 dark:!text-slate-100",
                                label: "!text-slate-700 dark:!text-slate-300",
                            }}
                        />
                        <Switch
                            aria-label="Enable X"
                            isSelected={formData.xEnabled}
                            isDisabled={!formData.xUrl.trim()}
                            onValueChange={(v) => handleInputChange("xEnabled", v)}
                        >
                            Enabled
                        </Switch>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <Button
                    type="submit"
                    color="primary"
                    startContent={<Save className="h-4 w-4" />}
                    isLoading={isPending}
                    disabled={isPending}
                >
                    Save Changes
                </Button>
            </div>
        </form>
    );
}

