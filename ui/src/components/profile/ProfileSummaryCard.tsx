import React, { useRef } from "react";
import { Camera, X } from "lucide-react";
import { Card, CardBody, Avatar, Chip } from "@heroui/react";
import { Button } from "@heroui/button";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import type { UserProfile } from "../../services/authService";
import { getRoleColor } from "../../constants/roles";

interface ProfileSummaryCardProps {
    profile: UserProfile;
}

export const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({ profile }) => {
    const { updateProfile, isUpdatingProfile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        toast.promise(
            updateProfile({
                userData: {},
                avatar: file,
            }),
            {
                loading: "Uploading new avatar...",
                success: "Avatar updated successfully!",
                error: "Failed to upload avatar. Please try again.",
            }
        );
    };

    const handleRemoveAvatar = async () => {
        toast.promise(
            updateProfile({
                userData: {},
                avatar: null,
            }),
            {
                loading: "Removing avatar...",
                success: "Avatar removed successfully!",
                error: "Failed to remove avatar. Please try again.",
            }
        );
    };

    const handleCameraClick = () => {
        fileInputRef.current?.click();
    };

    const fallbackInitials =
        profile.fullName
            ?.split(" ")
            .map((n) => n[0])
            .join("") ||
        profile.username?.[0]?.toUpperCase() ||
        "U";

    return (
        <Card className="shadow-warm">
            <CardBody className="p-6 text-center">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                />

                <div className="relative mb-6 w-28 h-28 mx-auto">
                    <Avatar
                        src={profile.avatar}
                        alt={profile.fullName || profile.username}
                        name={profile.fullName || profile.username}
                        className="w-28 h-28 text-3xl font-bold rounded-full bg-gradient-to-br from-primary-500 to-secondary-500"
                    >
                        {!profile.avatar && fallbackInitials}
                    </Avatar>

                    {isUpdatingProfile && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}

                    <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1">
                        <Button
                            variant="bordered"
                            size="sm"
                            className="bg-white dark:bg-gray-800 min-w-fit shadow-sm"
                            onPress={handleCameraClick}
                            disabled={isUpdatingProfile}
                        >
                            <Camera className="h-4 w-4" />
                        </Button>
                        {profile.avatar && (
                            <Button
                                variant="bordered"
                                size="sm"
                                className="bg-white dark:bg-gray-800 min-w-fit shadow-sm text-red-500 hover:text-red-700"
                                onPress={handleRemoveAvatar}
                                disabled={isUpdatingProfile}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                    {profile.fullName || profile.username}
                </h2>

                <div className="flex justify-center">
                    {profile.role && (
                        <Chip
                            color={getRoleColor(profile.role as any)}
                            variant="flat"
                            className="capitalize"
                        >
                            {profile.role}
                        </Chip>
                    )}
                </div>
            </CardBody>
        </Card>
    );
};
