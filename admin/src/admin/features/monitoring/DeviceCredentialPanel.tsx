import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  KeyRound,
  RefreshCw,
  ShieldAlert,
  ShieldOff,
} from "lucide-react";

import {
  Button,
} from "@shared/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/ui/card";

import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { useConfirm } from "@shared/ui/confirm-dialog-context";

import { formatDateTime } from "@shared/lib/utils-helpers";

import {
  fetchDeviceCredentialStatus,
  requestDeviceCredentialRotation,
  revokeDeviceCredential,
  type DeviceCredentialStatus,
} from "./monitoring.api";

/*
 * The Rotate action previously used the native browser prompt and
 * confirm dialogs to collect the rotation reason and confirm the
 * action. The native prompt dialog is not used anywhere else in this
 * codebase (the native confirm dialog alone is used elsewhere and is
 * known to work in the packaged Electron renderer), and native prompt
 * dialogs are unreliable/unsupported in many Electron BrowserWindow
 * configurations -- when unsupported, that call returns null
 * immediately with no error, which the previous handler silently
 * treated as "user cancelled," so clicking Rotate Credential did
 * nothing at all: no error shown, no network request ever sent. This
 * in-app modal replaces both native dialogs with the same proven UI
 * primitives (Input/Label, useConfirm) already used successfully
 * elsewhere in this app (for example the Software
 * Catalog enable/disable confirmation).
 */
function RotateCredentialModal({
  deviceId,
  onClose,
  onSubmit,
  submitting,
}: {
  deviceId: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  submitting: boolean;
}) {
  const [reason, setReason] = useState(
    "Scheduled security rotation",
  );

  const [formError, setFormError] =
    useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-foreground/30 p-4">
      <form
        className="w-full max-w-md rounded-lg border bg-background p-5 shadow-glass"
        onSubmit={(event) => {
          event.preventDefault();

          const trimmed = reason.trim();

          if (trimmed.length < 3) {
            setFormError(
              "A rotation reason of at least 3 characters is required.",
            );
            return;
          }

          onSubmit(trimmed);
        }}
      >
        <h2 className="text-lg font-bold">
          Rotate Device Credential
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Request credential rotation for device {deviceId}. The device
          will complete the rotation automatically the next time it
          checks in.
        </p>

        {formError && (
          <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
            {formError}
          </div>
        )}

        <div className="mt-4 space-y-2">
          <Label htmlFor="rotation-reason">
            Reason (visible in the audit trail)
          </Label>
          <Input
            autoFocus
            id="rotation-reason"
            onChange={(event) => {
              setReason(event.target.value);
              setFormError(null);
            }}
            value={reason}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            disabled={submitting}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={submitting} type="submit">
            {submitting ? "Requesting..." : "Request Rotation"}
          </Button>
        </div>
      </form>
    </div>
  );
}

type DeviceCredentialPanelProps = {
  deviceId: string;
  token: string | undefined;
};

function statusBadgeClass(
  status: DeviceCredentialStatus["status"],
): string {
  if (status === "revoked") {
    return "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400";
  }

  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
}

export function DeviceCredentialPanel({
  deviceId,
  token,
}: DeviceCredentialPanelProps) {
  const { confirm } = useConfirm();

  const [status, setStatus] =
    useState<DeviceCredentialStatus | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [rotating, setRotating] =
    useState(false);

  const [revoking, setRevoking] =
    useState(false);

  const [showRotateModal, setShowRotateModal] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchDeviceCredentialStatus(
        deviceId,
        token,
      );

      setStatus(result);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load device credential status.",
      );
    } finally {
      setLoading(false);
    }
  }, [deviceId, token]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function submitRotationRequest(reason: string) {
    setRotating(true);
    setError(null);
    setMessage(null);

    try {
      const result = await requestDeviceCredentialRotation(
        deviceId,
        reason,
        token,
      );

      setShowRotateModal(false);

      setMessage(
        "Credential rotation requested at " +
          formatDateTime(result.rotationRequestedAt) +
          ". The device will complete rotation on its next check-in.",
      );

      await loadStatus();
    } catch (rotationError) {
      setError(
        rotationError instanceof Error
          ? rotationError.message
          : "Failed to request credential rotation.",
      );
    } finally {
      setRotating(false);
    }
  }

  async function handleRevoke() {
    const confirmed = await confirm({
      title: "Revoke device credential?",
      description:
        "This immediately blocks device " +
        deviceId +
        " from authenticating until it is physically re-enrolled. This cannot be undone.",
      confirmLabel: "Revoke Credential",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setRevoking(true);
    setError(null);
    setMessage(null);

    try {
      await revokeDeviceCredential(deviceId, token);

      setMessage(
        "Device credential revoked. The device must be re-enrolled to authenticate again.",
      );

      await loadStatus();
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Failed to revoke device credential.",
      );
    } finally {
      setRevoking(false);
    }
  }

  const isRevoked = status?.status === "revoked";

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Device Credential Security
            </CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Rotate or revoke this device&apos;s authentication credential. The
              raw credential is never shown here.
            </p>
          </div>

          <Button
            disabled={loading}
            onClick={() => void loadStatus()}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCw
              className={
                "mr-2 h-4 w-4" + (loading ? " animate-spin" : "")
              }
            />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
            {message}
          </div>
        )}

        {loading && !status ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            Loading device credential status...
          </div>
        ) : !status ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            No device credential status available.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex justify-between gap-4 rounded-lg border p-3 text-sm">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold " +
                    statusBadgeClass(status.status)
                  }
                >
                  {status.status}
                </span>
              </div>

              <div className="flex justify-between gap-4 rounded-lg border p-3 text-sm">
                <span className="text-muted-foreground">Credential version</span>
                <span className="font-medium">{status.credentialVersion}</span>
              </div>

              <div className="flex justify-between gap-4 rounded-lg border p-3 text-sm">
                <span className="text-muted-foreground">Issued</span>
                <span className="font-medium">
                  {formatDateTime(status.issuedAt)}
                </span>
              </div>

              <div className="flex justify-between gap-4 rounded-lg border p-3 text-sm">
                <span className="text-muted-foreground">Last used</span>
                <span className="font-medium">
                  {status.lastUsedAt
                    ? formatDateTime(status.lastUsedAt)
                    : "No data"}
                </span>
              </div>

              {status.rotatedAt && (
                <div className="flex justify-between gap-4 rounded-lg border p-3 text-sm">
                  <span className="text-muted-foreground">Last rotated</span>
                  <span className="font-medium">
                    {formatDateTime(status.rotatedAt)}
                  </span>
                </div>
              )}

              {status.revokedAt && (
                <div className="flex justify-between gap-4 rounded-lg border p-3 text-sm">
                  <span className="text-muted-foreground">Revoked</span>
                  <span className="font-medium">
                    {formatDateTime(status.revokedAt)}
                  </span>
                </div>
              )}
            </div>

            {status.rotationRequestedAt && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                Rotation requested at{" "}
                {formatDateTime(status.rotationRequestedAt)}
                {status.rotationReason
                  ? " — " + status.rotationReason
                  : ""}
                . Waiting for the device to complete rotation on its next
                check-in.
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isRevoked || rotating || revoking}
                onClick={() => setShowRotateModal(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                <ShieldAlert className="mr-2 h-4 w-4" />
                {rotating ? "Requesting..." : "Rotate Credential"}
              </Button>

              <Button
                disabled={isRevoked || rotating || revoking}
                onClick={() => void handleRevoke()}
                size="sm"
                type="button"
                variant="outline"
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                {revoking
                  ? "Revoking..."
                  : isRevoked
                    ? "Already Revoked"
                    : "Revoke Credential"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Rotation takes effect the next time the device checks in and does
              not interrupt monitoring. Revoking immediately blocks the device
              from authenticating until it is physically re-enrolled.
            </p>
          </>
        )}
      </CardContent>

      {showRotateModal && (
        <RotateCredentialModal
          deviceId={deviceId}
          onClose={() => setShowRotateModal(false)}
          onSubmit={(reason) => void submitRotationRequest(reason)}
          submitting={rotating}
        />
      )}
    </Card>
  );
}
