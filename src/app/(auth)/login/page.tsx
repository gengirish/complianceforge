import { env } from "@/lib/env";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const oauthGoogleEnabled = Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
  );
  const oauthGithubEnabled = Boolean(
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
  );

  return (
    <LoginForm
      oauthGoogleEnabled={oauthGoogleEnabled}
      oauthGithubEnabled={oauthGithubEnabled}
    />
  );
}
