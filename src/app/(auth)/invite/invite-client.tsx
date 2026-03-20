"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { acceptInvitationAction } from "@/server/actions";

export function InviteClient({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Team invitation</CardTitle>
          <CardDescription>
            Accept this invitation to join the organization on ComplianceForge.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            type="button"
            disabled={pending}
            className="w-full"
            onClick={() => {
              startTransition(async () => {
                try {
                  await acceptInvitationAction(token);
                  toast.success("You have joined the organization");
                  router.push("/dashboard");
                  router.refresh();
                } catch (e) {
                  const msg =
                    e instanceof Error ? e.message : "Something went wrong";
                  toast.error(msg);
                }
              });
            }}
          >
            {pending ? "Accepting…" : "Accept invitation"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Sign in first with the email address that received the invite.{" "}
            <Link href={"/login" as Route} className="text-primary hover:underline">
              Go to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
