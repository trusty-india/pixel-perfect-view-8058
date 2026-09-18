import {
  createFileRoute,
  useNavigate,
  Link,
  useSearch,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — 29Bricks" },
      { name: "description", content: "Sign in or create your free 29Bricks account." },
      { property: "og:title", content: "Sign in — 29Bricks" },
      { property: "og:description", content: "Access your 29Bricks account." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { returnTo?: string | undefined } => ({
    // Only same-app paths are honored (must start with a single "/").
    returnTo:
      typeof search["returnTo"] === "string" &&
      /^\/[^/]/.test(search["returnTo"])
        ? search["returnTo"]
        : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const returnTo = useSearch({ from: "/auth" }).returnTo;
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user)
      void navigate({ to: returnTo ?? "/profile", replace: true });
  }, [user, navigate, returnTo]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, phone },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        void navigate({ to: returnTo ?? "/profile" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-soft">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl gradient-brand text-primary-foreground">
            <Building2 className="size-5" />
          </span>
          <span className="font-display text-xl font-bold">29Bricks</span>
        </Link>
        <h1 className="mt-5 text-lg font-bold">
          {mode === "signin" ? "Sign in to continue" : "Create your account"}
        </h1>
        <p className="text-xs text-muted-foreground">
          Post properties, save favourites and chat with the team.
        </p>

        <form className="mt-5 space-y-3" onSubmit={submit}>
          {mode === "signup" ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Mobile number</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full rounded-xl">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        {/* Direct Supabase OAuth — the same architecture as email/password sign-in.
            The /auth page's existing signed-in effect handles the return to /profile. */}
        <Button
          variant="outline"
          className="mt-3 w-full rounded-xl"
          disabled={busy}
          onClick={async () => {
            try {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: window.location.origin },
              });
              if (error) throw error;
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not start Google sign-in");
            }
          }}
        >
          Continue with Google
        </Button>

        <button
          type="button"
          className="mt-4 w-full text-center text-xs text-muted-foreground"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin"
            ? "New to 29Bricks? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
