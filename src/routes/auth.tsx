import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { checkHasAdminFn } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin sign in — Smash & Shake" },
      { name: "description", content: "Sign in to manage the Smash & Shake menu." },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async () => {
    return await checkHasAdminFn();
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const initialData = Route.useLoaderData();
  const { data: adminStatus } = useQuery({
    queryKey: ["has-admin"],
    queryFn: () => checkHasAdminFn(),
    initialData,
  });

  const hasAdmin = adminStatus?.hasAdmin ?? true;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hasAdmin && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setBusy(true);

    try {
      if (!hasAdmin) {
        const { error: signUpError } = await authClient.signUp.email({
          name: name.trim() || "Admin",
          email: email.trim(),
          password,
        });
        if (signUpError) {
          setError(signUpError.message ?? "Failed to create admin account");
        } else {
          navigate({ to: "/admin" });
        }
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message ?? "Invalid email or password");
        } else {
          navigate({ to: "/admin" });
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 font-sans text-foreground">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-2xl">
        <h1 className="font-display text-4xl text-primary text-center mb-2">
          {hasAdmin ? "Admin Sign In" : "Setup Admin Account"}
        </h1>
        <p className="text-xs text-muted-foreground text-center mb-6">
          {hasAdmin
            ? "Sign in to manage the menu items and settings."
            : "No admin exists yet. Register the 1st account to become the sole admin. New account registrations will be permanently locked."}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {!hasAdmin && (
            <Input
              type="text"
              placeholder="Admin full name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}

          <Input
            type="email"
            placeholder="Admin email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 6 characters)"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {!hasAdmin && (
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}

          {error && <p className="text-xs text-destructive text-center">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Processing..." : hasAdmin ? "Sign in" : "Create Admin & Lock Registration"}
          </Button>
        </form>
      </div>
    </main>
  );
}
