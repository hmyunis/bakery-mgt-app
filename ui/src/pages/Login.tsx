import { useState, type FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardBody, Input, Button, Divider } from "@heroui/react";
import { Phone, Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useThemeInit } from "../hooks/useThemeInit";
import { useThemeColor } from "../hooks/useThemeColor";
import { useAppSelector } from "../store";
import { getAuthToken } from "../lib/apiClient";
import { toast } from "sonner";
import { useBakerySettings } from "../hooks/useBakery";

export function Login() {
    const navigate = useNavigate();
    const { login, isLoggingIn } = useAuth();
    useThemeInit(); // Initialize theme from persisted state
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    const { data: bakerySettings } = useBakerySettings();
    useThemeColor(bakerySettings?.themeColor); // Apply dynamic theme color
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        const token = getAuthToken();
        if (isAuthenticated || token) {
            navigate("/app/dashboard", { replace: true });
        }
    }, [isAuthenticated, navigate]);

    // Auto-detect if identifier is a phone number or username
    const isPhoneNumber = (value: string): boolean => {
        const trimmed = value.trim();
        // Check if it starts with + or contains only digits (with optional +, -, spaces)
        return /^\+?[\d\s-]+$/.test(trimmed) && trimmed.replace(/\D/g, "").length >= 7;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!identifier.trim() || !password.trim()) {
            toast.error("Please fill in all fields");
            return;
        }

        const credentials = isPhoneNumber(identifier)
            ? { phoneNumber: identifier.trim(), password }
            : { username: identifier.trim(), password };

        const loginPromise = login(credentials);

        toast.promise(loginPromise, {
            loading: "Signing in...",
            success: "Welcome back!",
            error: (err: any) => {
                const errorData = err.response?.data;
                // Handle wrapped error response: { success: false, message, errors: { ... } }
                if (errorData?.errors) {
                    return (
                        errorData.errors.nonFieldErrors?.[0] ||
                        errorData.errors.non_field_errors?.[0] ||
                        errorData.errors.detail ||
                        errorData.message ||
                        "Login failed. Please check your credentials."
                    );
                }
                return (
                    errorData?.nonFieldErrors?.[0] ||
                    errorData?.non_field_errors?.[0] ||
                    errorData?.detail ||
                    errorData?.message ||
                    err.message ||
                    "Login failed. Please check your credentials."
                );
            },
        });
    };

    const handleBack = () => {
        navigate("/");
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden bg-[var(--bg)]">
            {/* Background decoration */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -right-24 size-[420px] rounded-full bg-gradient-to-br from-[var(--accent)]/20 via-purple-500/10 to-rose-500/10 blur-3xl" />
                <div className="absolute -bottom-32 -left-24 size-[520px] rounded-full bg-gradient-to-br from-amber-400/15 via-orange-500/10 to-rose-500/10 blur-3xl" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5 dark:to-white/5" />
            </div>

            {/* Back Button */}
            <Button
                variant="light"
                size="sm"
                className="absolute top-6 left-6 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                onPress={handleBack}
            >
                <ArrowLeft className="size-4 mr-2" />
                Back
            </Button>

            <div className="relative w-full max-w-md">
                <Card className="shadow-2xl bg-[var(--panel)]/85 border border-[var(--border)] backdrop-blur-xl">
                    <CardBody className="p-7 sm:p-8">
                        {/* Brand header */}
                        <div className="flex items-center gap-4 mb-6">
                            {bakerySettings?.logoUrl ? (
                                <img
                                    src={bakerySettings.logoUrl}
                                    alt={bakerySettings?.name || "Bakery"}
                                    className="size-14 rounded-2xl object-contain bg-white/70 dark:bg-black/10 border border-[var(--border)]"
                                />
                            ) : (
                                <div className="size-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] via-[var(--accent)]/70 to-purple-600/80 flex items-center justify-center shadow-lg shadow-[var(--accent)]/30 border border-[var(--border)]">
                                    <span className="text-2xl font-semibold">🍞</span>
                                </div>
                            )}
                            <div className="min-w-0">
                                <div className="text-lg font-bold text-[var(--fg)] truncate">
                                    {bakerySettings?.name || "Bakery"}
                                </div>
                                <div className="text-sm text-[var(--muted)]">
                                    Sign in to manage your bakery
                                </div>
                            </div>
                        </div>

                        <Divider className="mb-6" />

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Username / Phone Number Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--fg)]">
                                    Username / Phone Number
                                </label>
                                <Input
                                    type="text"
                                    placeholder="admin or +251911234567"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    required
                                    disabled={isLoggingIn}
                                    startContent={
                                        isPhoneNumber(identifier) ? (
                                            <Phone className="size-4 text-default-400 pointer-events-none shrink-0" />
                                        ) : (
                                            <User className="size-4 text-default-400 pointer-events-none shrink-0" />
                                        )
                                    }
                                    classNames={{
                                        input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                    }}
                                />
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoggingIn}
                                    startContent={
                                        <Lock className="size-4 text-default-400 pointer-events-none shrink-0" />
                                    }
                                    endContent={
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="focus:outline-none"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="size-4 text-default-400" />
                                            ) : (
                                                <Eye className="size-4 text-default-400" />
                                            )}
                                        </button>
                                    }
                                    classNames={{
                                        input: "!text-slate-900 dark:!text-slate-100 !placeholder:text-slate-400 dark:!placeholder:text-slate-500",
                                    }}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-[var(--accent)] text-white font-medium shadow-lg shadow-[var(--accent)]/20"
                                isLoading={isLoggingIn}
                                disabled={isLoggingIn}
                            >
                                {isLoggingIn ? "Signing In..." : "Sign In"}
                            </Button>
                        </form>
                    </CardBody>
                </Card>

                {/* Footer */}
                <footer className="mt-6 text-center">
                    <p className="text-xs text-[var(--muted)]">
                        © {new Date().getFullYear()} {bakerySettings?.name || "Bakery"}. All rights
                        reserved.
                    </p>
                </footer>
            </div>
        </div>
    );
}
