import { ArrowLeft, KeyRound, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { PasswordInput } from "@shared/ui/password-input";
import {
  fetchAdministratorCredentialStatus,
  saveAdministratorCredentials,
  type AdministratorCredentialStatus,
} from "./account-security.api";

export function AccountSecurityPage() {
  const session = useMemo(() => getStoredAuthSession(), []);
  const token = session?.accessToken;
  const isOwner = session?.user.role === "Owner";
  const [status, setStatus] = useState<AdministratorCredentialStatus | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOwner) return;
    fetchAdministratorCredentialStatus(token)
      .then((next) => {
        setStatus(next);
        setEmail(next.email ?? "");
      })
      .catch((error: Error) => setMessage(error.message));
  }, [isOwner, token]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const next = await saveAdministratorCredentials(
        {
          email: email.trim() || undefined,
          password: password || undefined,
          confirmPassword: confirmPassword || undefined,
        },
        token,
      );
      setStatus(next);
      setEmail(next.email ?? "");
      setPassword("");
      setConfirmPassword("");
      setMessage("Administrator credentials saved.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Button asChild variant="ghost">
            <Link to="/settings">
              <ArrowLeft className="h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </header>
      <div className="container py-6">
        <Card className="glass max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Administrator Credentials
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isOwner ? (
              <p className="text-sm text-muted-foreground">Only Owner can create or change Administrator credentials.</p>
            ) : (
              <div className="space-y-4">
                <p className="rounded-lg border bg-muted px-3 py-2 text-sm font-semibold">
                  {status?.configured ? "Administrator configured" : "Administrator not configured"}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Administrator email</Label>
                  <Input id="adminEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">{status?.configured ? "New password" : "Password"}</Label>
                    <PasswordInput id="adminPassword" value={password} onChange={(event) => setPassword(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminConfirmPassword">Confirm password</Label>
                    <PasswordInput id="adminConfirmPassword" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                  </div>
                </div>
                {message && <p className="rounded-lg border bg-muted px-3 py-2 text-sm">{message}</p>}
                <Button disabled={saving || !email.trim() || (!status?.configured && !password)} onClick={() => void save()} type="button">
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Administrator Credentials"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
