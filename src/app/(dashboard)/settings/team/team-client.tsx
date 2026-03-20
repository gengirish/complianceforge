"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  inviteTeamMemberAction,
  updateTeamMemberRoleAction,
  removeTeamMemberAction,
  resendInvitationAction,
  revokeInvitationAction,
} from "@/server/actions";
import { checkPermission } from "@/lib/rbac";

export type TeamMemberRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
};

export type PendingInviteRow = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
};

type Props = {
  members: TeamMemberRow[];
  pendingInvites: PendingInviteRow[];
  currentUserId: string;
  actorRole: string;
};

const ROLE_OPTIONS = ["admin", "editor", "viewer"] as const;

export function TeamClient({
  members,
  pendingInvites,
  currentUserId,
  actorRole,
}: Props) {
  const [pending, startTransition] = useTransition();
  const canManage = checkPermission(actorRole, "team:invite");

  function runAction(
    label: string,
    fn: () => Promise<unknown>
  ) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(label);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        toast.error(msg);
      }
    });
  }

  return (
    <div className="space-y-8">
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite member</CardTitle>
            <CardDescription>
              Sends a 7-day email invitation via AgentMail (when inbox is
              configured).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const email = (fd.get("email") as string) ?? "";
                const role = (fd.get("role") as string) ?? "editor";
                runAction("Invitation sent", () =>
                  inviteTeamMemberAction(email, role)
                );
              }}
            >
              <div className="flex-1 space-y-2">
                <label htmlFor="invite-email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  disabled={pending}
                />
              </div>
              <div className="w-full space-y-2 sm:w-40">
                <label htmlFor="invite-role" className="text-sm font-medium">
                  Role
                </label>
                <select
                  id="invite-role"
                  name="role"
                  disabled={pending}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  defaultValue="editor"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={pending} className="sm:mb-0">
                {pending ? "Sending…" : "Invite"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>
            People with access to this organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">Email</th>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 pr-4 font-medium">Joined</th>
                {canManage ? (
                  <th className="pb-3 font-medium text-right">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border/60">
                  <td className="py-3 pr-4 font-medium">
                    {m.name ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {m.email}
                  </td>
                  <td className="py-3 pr-4">
                    {canManage && m.id !== currentUserId ? (
                      <select
                        className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        defaultValue={m.role}
                        disabled={pending}
                        onChange={(e) => {
                          const next = e.target.value;
                          runAction("Role updated", () =>
                            updateTeamMemberRoleAction(m.id, next)
                          );
                        }}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="capitalize">{m.role}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                  {canManage ? (
                    <td className="py-3 text-right">
                      {m.id !== currentUserId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={pending}
                          onClick={() => {
                            if (
                              !confirm(
                                `Remove ${m.email} from this organization?`
                              )
                            )
                              return;
                            runAction("Member removed", () =>
                              removeTeamMemberAction(m.id)
                            );
                          }}
                        >
                          Remove
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {pendingInvites.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending invitations</CardTitle>
            <CardDescription>
              Invites that have not been accepted yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium">Role</th>
                  <th className="pb-3 pr-4 font-medium">Expires</th>
                  {canManage ? (
                    <th className="pb-3 font-medium text-right">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/60">
                    <td className="py-3 pr-4">{inv.email}</td>
                    <td className="py-3 pr-4 capitalize">{inv.role}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    {canManage ? (
                      <td className="py-3 text-right space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            runAction("Invitation resent", () =>
                              resendInvitationAction(inv.id)
                            )
                          }
                        >
                          Resend
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={pending}
                          onClick={() =>
                            runAction("Invitation revoked", () =>
                              revokeInvitationAction(inv.id)
                            )
                          }
                        >
                          Revoke
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
