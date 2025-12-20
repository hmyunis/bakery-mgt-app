import { Button, Card } from "@heroui/react";
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export function AccessDeniedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--fg)] px-6">
            <Card className="p-8 max-w-lg w-full bg-[var(--panel)] border border-[var(--border)] text-center space-y-4">
                <ShieldAlert className="size-10 text-[var(--accent)] mx-auto" />
                <h1 className="text-3xl font-bold">Access denied</h1>
                <p className="text-[var(--muted)]">You do not have permission to view this page.</p>
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
    );
}
