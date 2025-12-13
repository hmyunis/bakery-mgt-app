import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardBody, Input, Button } from "@heroui/react";
import { Phone, Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useThemeInit } from "../hooks/useThemeInit";
import { useAppSelector } from "../store";
import { getAuthToken } from "../lib/apiClient";
import { toast } from "sonner";

export function Login() {
  const navigate = useNavigate();
  const { login, isLoggingIn } = useAuth();
  useThemeInit(); // Initialize theme from persisted state
  const { isAuthenticated } = useAppSelector((state) => state.auth);
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
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative bg-gradient-to-br from-[var(--bg)] via-[var(--bg)] to-[var(--bg)]">
      {/* Back Button */}
      <Button
        variant="light"
        size="sm"
        className="absolute top-6 left-6 text-[var(--muted)] hover:text-[var(--fg)]"
        onPress={handleBack}
      >
        <ArrowLeft className="size-4 mr-2" />
        Back
      </Button>

      <div className="w-full max-w-md">
        <Card className="shadow-2xl bg-[var(--panel)] border border-[var(--border)] backdrop-blur-xl">
          <CardBody className="p-8">
            {/* Logo and Welcome Text */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="size-20 rounded-2xl bg-gradient-to-br from-[var(--accent)] via-[var(--accent)]/70 to-purple-600/80 flex items-center justify-center shadow-lg shadow-[var(--accent)]/40">
                  <span className="text-3xl font-semibold">🍞</span>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-[var(--fg)] mb-2">
                Welcome Back
              </h1>
              <p className="text-[var(--muted)]">Sign in to your account</p>
            </div>

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
                    input: "text-[var(--fg)]",
                    inputWrapper: "bg-[var(--bg)] border-[var(--border)]",
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
                    input: "text-[var(--fg)]",
                    inputWrapper: "bg-[var(--bg)] border-[var(--border)]",
                  }}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[var(--accent)] text-white font-medium"
                isLoading={isLoggingIn}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

