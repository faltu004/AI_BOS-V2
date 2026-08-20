import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  ArrowLeft,
  Package,
  Pencil,
  Plus,
  PowerOff,
  RefreshCw,
} from "lucide-react";

import { getStoredAuthSession } from "@shared/auth/auth-service";
import { Button } from "@shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/ui/card";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { useAdministratorMonitoringAccess } from "@/admin/features/administrator-access/AdministratorMonitoringAccessContext";

import {
  createSoftwareCatalogPackage,
  fetchSoftwareCatalog,
  updateSoftwareCatalogPackage,
  type SoftwareCatalogPackage,
  type SoftwareCatalogPackageInput,
} from "./monitoring.api";

const emptyForm: SoftwareCatalogPackageInput = {
  name: "",
  version: "",
  publisher: "",
  packageType: "MSI",
  downloadUrl: "",
  sha256: "",
  productCode: "",
  enabled: true,
};

const sha256Pattern = /^[A-Fa-f0-9]{64}$/;
const productCodePattern =
  /^\{[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}\}$/;

function validateForm(
  form: SoftwareCatalogPackageInput,
): string | null {
  if (!form.name.trim()) {
    return "Application name is required.";
  }

  if (!form.version.trim()) {
    return "Version is required.";
  }

  if (!form.publisher.trim()) {
    return "Publisher is required.";
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(form.downloadUrl.trim());
  } catch {
    return "Download URL must be a valid URL.";
  }

  if (parsedUrl.protocol !== "https:") {
    return "Download URL must use HTTPS.";
  }

  if (parsedUrl.username || parsedUrl.password) {
    return "Download URL cannot contain embedded credentials.";
  }

  if (!sha256Pattern.test(form.sha256.trim())) {
    return "SHA256 must be exactly 64 hexadecimal characters.";
  }

  if (!productCodePattern.test(form.productCode.trim())) {
    return "MSI Product Code must be a GUID enclosed in braces, e.g. {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}.";
  }

  return null;
}

type FormMode =
  | { kind: "create" }
  | { kind: "edit"; packageId: string };

export function SoftwareCatalogPage() {
  const { hasPermission } = useAdministratorMonitoringAccess();
  const session = getStoredAuthSession();
  const token = session?.accessToken;
  const canManageCatalog = hasPermission("device.software.manage");

  const [packages, setPackages] = useState<
    SoftwareCatalogPackage[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>({
    kind: "create",
  });
  const [form, setForm] =
    useState<SoftwareCatalogPackageInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(
    null,
  );

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchSoftwareCatalog(token);
      setPackages(result.packages ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load the software catalog.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  function openCreateForm() {
    setForm(emptyForm);
    setFormMode({ kind: "create" });
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(softwarePackage: SoftwareCatalogPackage) {
    setForm({
      name: softwarePackage.name,
      version: softwarePackage.version,
      publisher: softwarePackage.publisher,
      packageType: "MSI",
      downloadUrl: softwarePackage.downloadUrl,
      sha256: softwarePackage.sha256,
      productCode: softwarePackage.productCode,
      enabled: softwarePackage.enabled,
    });
    setFormMode({
      kind: "edit",
      packageId: softwarePackage.packageId,
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function submitForm() {
    const normalized: SoftwareCatalogPackageInput = {
      ...form,
      name: form.name.trim(),
      version: form.version.trim(),
      publisher: form.publisher.trim(),
      downloadUrl: form.downloadUrl.trim(),
      sha256: form.sha256.trim().toUpperCase(),
      productCode: form.productCode.trim().toUpperCase(),
    };

    const validationError = validateForm(normalized);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (formMode.kind === "create") {
        await createSoftwareCatalogPackage(
          normalized,
          token,
        );

        setMessage(
          normalized.name + " added to the approved catalog.",
        );
      } else {
        await updateSoftwareCatalogPackage(
          formMode.packageId,
          normalized,
          token,
        );

        setMessage(normalized.name + " updated.");
      }

      setFormOpen(false);
      await loadCatalog();
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save the software package.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(
    softwarePackage: SoftwareCatalogPackage,
  ) {
    const nextEnabled = !softwarePackage.enabled;

    const confirmed = window.confirm(
      (nextEnabled ? "Enable" : "Disable") +
        " " +
        softwarePackage.name +
        " " +
        softwarePackage.version +
        "? " +
        (nextEnabled
          ? "Devices will be able to install it again."
          : "Devices will no longer be able to install or update it. Uninstall remains available."),
    );

    if (!confirmed) {
      return;
    }

    setTogglingId(softwarePackage.packageId);
    setError(null);
    setMessage(null);

    try {
      await updateSoftwareCatalogPackage(
        softwarePackage.packageId,
        { enabled: nextEnabled },
        token,
      );

      setMessage(
        softwarePackage.name +
          " is now " +
          (nextEnabled ? "enabled" : "disabled") +
          ".",
      );

      await loadCatalog();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Failed to update the software package.",
      );
    } finally {
      setTogglingId(null);
    }
  }

  if (!canManageCatalog) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-6">
        <Button asChild size="sm" type="button" variant="outline">
          <Link to="/monitoring">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Software Catalog</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The Owner has not enabled this permission for the signed-in
            Administrator.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild size="sm" type="button" variant="outline">
            <Link to="/monitoring">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>

          <div>
            <p className="text-sm font-semibold text-primary">
              Endpoint Monitoring
            </p>

            <h1 className="text-2xl font-bold">
              Software Catalog
            </h1>

            <p className="text-sm text-muted-foreground">
              Approved MSI packages devices are allowed to install.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            disabled={loading}
            onClick={() => void loadCatalog()}
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

          <Button onClick={openCreateForm} size="sm" type="button">
            <Plus className="mr-2 h-4 w-4" />
            Add Package
          </Button>
        </div>
      </div>

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

      {formOpen && (
        <Card className="glass">
          <CardHeader>
            <CardTitle>
              {formMode.kind === "create"
                ? "Add Software Package"
                : "Edit Software Package"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
                {formError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sc-name">Application Name</Label>
                <Input
                  id="sc-name"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="7-Zip"
                  value={form.name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sc-version">Version</Label>
                <Input
                  id="sc-version"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      version: event.target.value,
                    }))
                  }
                  placeholder="23.01"
                  value={form.version}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sc-publisher">Publisher</Label>
                <Input
                  id="sc-publisher"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      publisher: event.target.value,
                    }))
                  }
                  placeholder="Igor Pavlov"
                  value={form.publisher}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sc-package-type">Package Type</Label>
                <Input
                  disabled
                  id="sc-package-type"
                  value="MSI"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sc-download-url">
                  Download URL (HTTPS only)
                </Label>
                <Input
                  id="sc-download-url"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      downloadUrl: event.target.value,
                    }))
                  }
                  placeholder="https://example.com/packages/7zip-23.01-x64.msi"
                  value={form.downloadUrl}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sc-sha256">SHA256 (64 hex characters)</Label>
                <Input
                  className="font-mono text-xs"
                  id="sc-sha256"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sha256: event.target.value,
                    }))
                  }
                  placeholder="0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCD"
                  value={form.sha256}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sc-product-code">
                  MSI Product Code
                </Label>
                <Input
                  className="font-mono text-xs"
                  id="sc-product-code"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      productCode: event.target.value,
                    }))
                  }
                  placeholder="{23170F69-40C1-2702-2301-000001000000}"
                  value={form.productCode}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={form.enabled}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      enabled: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                Enabled (installable by devices)
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={saving}
                onClick={() => void submitForm()}
                type="button"
              >
                {saving ? "Saving..." : "Save Package"}
              </Button>

              <Button
                disabled={saving}
                onClick={() => setFormOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Approved Packages
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading && packages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading software catalog...
            </p>
          ) : packages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No approved software packages yet. Add one to make it
              available for install on managed devices.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3">Application</th>
                    <th className="px-3 py-3">Version</th>
                    <th className="px-3 py-3">Publisher</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {packages.map((softwarePackage) => (
                    <tr
                      className="border-b last:border-0"
                      key={softwarePackage.packageId}
                    >
                      <td className="px-3 py-4">
                        <p className="font-semibold">
                          {softwarePackage.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          MSI · {softwarePackage.packageId}
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        {softwarePackage.version}
                      </td>

                      <td className="px-3 py-4">
                        {softwarePackage.publisher}
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={
                            "rounded-full border px-2.5 py-1 text-xs font-semibold " +
                            (softwarePackage.enabled
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "border-slate-500/40 bg-slate-500/10 text-slate-600 dark:text-slate-400")
                          }
                        >
                          {softwarePackage.enabled
                            ? "Enabled"
                            : "Disabled"}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() =>
                              openEditForm(softwarePackage)
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>

                          <Button
                            disabled={
                              togglingId ===
                              softwarePackage.packageId
                            }
                            onClick={() =>
                              void toggleEnabled(softwarePackage)
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <PowerOff className="mr-2 h-4 w-4" />
                            {togglingId ===
                            softwarePackage.packageId
                              ? "Saving..."
                              : softwarePackage.enabled
                                ? "Disable"
                                : "Enable"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Package integrity is verified by SHA256 on the device before
        install. Only MSI packages are supported. Removing a package is
        not supported by the backend in this release — disable it
        instead to block future installs.
      </p>
    </div>
  );
}
