import { Button, Card } from "@heroui/react";
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { setAuthToken } from "../lib/apiClient";

export function AccessDeniedPage() {
    const { logout, isLoggingOut } = useAuth();

    const handleLogout = async () => {
        try {
            setAuthToken(null);
            localStorage.clear();
        } finally {
            await logout();
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] px-6">
            <div className="pt-6 flex justify-center">
                <div className="w-full max-w-lg flex justify-end">
                    <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        isLoading={isLoggingOut}
                        onPress={handleLogout}
                    >
                        Logout
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-center py-10">
                <Card className="p-8 max-w-lg w-full bg-[var(--panel)] border border-[var(--border)] text-center space-y-4">
                    <ShieldAlert className="size-10 text-[var(--accent)] mx-auto" />
                    <h1 className="text-3xl font-bold">Access denied</h1>
                    <p className="text-[var(--muted)]">
                        You do not have permission to view this page.
                    </p>
                    <Button
                        as={Link}
                        to="/"
                        variant="bordered"
                        className="mx-auto border-[var(--fg)]/20 text-[var(--fg)]"
                    >
                        Back to home
                    </Button>
                </Card>
            </div>
        </div>
    );
}
