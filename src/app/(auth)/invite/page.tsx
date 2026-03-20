import { InviteClient } from "./invite-client";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token?.trim()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-sm text-muted-foreground">
        Missing invitation token. Check your email link or ask an admin to resend
        the invite.
      </div>
    );
  }

  return <InviteClient token={token.trim()} />;
}
