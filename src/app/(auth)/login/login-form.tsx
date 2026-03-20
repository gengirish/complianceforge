"use client";

import { Shield } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { loginAction } from "@/server/actions";
import { useTransition } from "react";

type Props = {
  oauthGoogleEnabled: boolean;
  oauthGithubEnabled: boolean;
};

export function LoginForm({ oauthGoogleEnabled, oauthGithubEnabled }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDemoLogin() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", "demo@complianceforge-ai.com");
      formData.set("name", "Demo User");
      await loginAction(formData);
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">ComplianceForge</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            EU AI Act Compliance Platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your details to access the compliance dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={loginAction} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Your Name"
                  defaultValue="Demo User"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  defaultValue="demo@complianceforge-ai.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {oauthGoogleEnabled ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isPending}
                  onClick={() =>
                    signIn("google", { callbackUrl: "/dashboard" })
                  }
                >
                  Continue with Google
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled
                  title="Coming soon"
                >
                  Continue with Google
                </Button>
              )}
              {oauthGithubEnabled ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isPending}
                  onClick={() =>
                    signIn("github", { callbackUrl: "/dashboard" })
                  }
                >
                  Continue with GitHub
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled
                  title="Coming soon"
                >
                  Continue with GitHub
                </Button>
              )}
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleDemoLogin}
              disabled={isPending}
            >
              {isPending ? "Loading..." : "Launch Demo"}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Enforcement deadline: August 2, 2026 — Start your compliance journey
          today.
        </p>
      </div>
    </div>
  );
}
