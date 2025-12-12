import { Button, Card } from "@heroui/react";
import { Home } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--fg)] px-6">
      <Card className="p-8 max-w-lg w-full bg-[var(--panel)] border border-[var(--border)] text-center space-y-4">
        <div className="text-5xl">🗺️</div>
        <h1 className="text-3xl font-bold">404</h1>
        <p className="text-[var(--muted)]">
          The page you are looking for does not exist.
        </p>
        <Button
          as={Link}
          to="/"
          color="primary"
          className="mx-auto flex items-center gap-2 bg-[var(--accent)] text-white border border-[var(--accent)]/60"
        >
          <Home className="size-4" />
          Back home
        </Button>
      </Card>
    </div>
  );
}

