import { Card, CardBody, CardHeader, Divider } from "@heroui/react";
import { CheckCircle2 } from "lucide-react";

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] px-6 py-10 flex items-start justify-center">
      <Card className="w-full max-w-3xl bg-[var(--panel)] border border-[var(--border)]">
        <CardHeader className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-[var(--accent)]" />
          <p className="text-xl font-semibold">Protected Dashboard</p>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-3">
          <p className="text-[var(--muted)]">
            This area is wrapped by a role-based ProtectedRoute. Adjust allowed roles in the route config to control access per backend roles.
          </p>
          <p className="text-sm text-[var(--muted)]">
            Replace this placeholder with your real dashboard content.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

