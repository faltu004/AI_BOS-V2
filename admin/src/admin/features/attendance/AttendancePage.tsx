import { CalendarDays, RefreshCw, Search, ShieldCheck, UserRoundX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Dialog } from "@shared/ui/dialog";
import {
  fetchAdminAttendanceOverview,
  resetEmployeeFaceEnrollment,
  type AdminAttendanceOverview,
  type AttendanceOverviewFilters,
} from "./attendance.api";

const today = new Date().toISOString().slice(0, 10);

function time(value?: string) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function methodLabel(method?: "face" | "manual", verified?: boolean) {
  if (method === "manual") return "Manual, not face verified";
  return verified ? "Face verified" : "Verification unavailable";
}

function enrollmentLabel(status: string) {
  if (status === "active") return "Enrolled";
  if (status === "reset_required") return "Re-enrollment required";
  if (status === "revoked") return "Deleted or replaced";
  return "Not enrolled";
}

export function AttendancePage() {
  const [filters, setFilters] = useState<AttendanceOverviewFilters>({ date: today });
  const [searchDraft, setSearchDraft] = useState("");
  const [overview, setOverview] = useState<AdminAttendanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<{ id: string; fullName: string } | null>(null);
  const [resetReason, setResetReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await fetchAdminAttendanceOverview(filters));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Attendance overview could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => {
    const records = overview?.records ?? [];
    return {
      total: overview?.total ?? 0,
      face: records.filter((record) => record.checkInMethod === "face" && record.checkInFaceVerified).length,
      manual: records.filter((record) => record.checkInMethod === "manual").length,
      checkedOut: records.filter((record) => Boolean(record.checkOutAt)).length,
    };
  }, [overview]);

  const resetEnrollment = async () => {
    if (!resetTarget || resetReason.trim().length < 3) return;
    setResettingUserId(resetTarget.id);
    setError(null);
    try {
      await resetEmployeeFaceEnrollment(resetTarget.id, resetReason.trim());
      setResetTarget(null);
      setResetReason("");
      await load();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Enrollment could not be reset.");
    } finally {
      setResettingUserId(null);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/40 px-5 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Workforce operations</p>
            <h1 className="mt-1 text-2xl font-bold">Attendance</h1>
          </div>
          <Button disabled={loading} onClick={() => void load()} type="button" variant="outline">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Records", value: counts.total },
            { label: "Face verified", value: counts.face },
            { label: "Manual", value: counts.manual },
            { label: "Checked out", value: counts.checkedOut },
          ].map((item) => (
            <div className="rounded-md border bg-card px-4 py-3" key={item.label}>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 border-y py-4 md:grid-cols-[180px_1fr_180px_180px_auto]">
          <div>
            <Label htmlFor="attendance-date">Date</Label>
            <Input id="attendance-date" onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} type="date" value={filters.date} />
          </div>
          <div>
            <Label htmlFor="attendance-search">Employee</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" id="attendance-search" onChange={(event) => setSearchDraft(event.target.value)} placeholder="Name, email, or employee code" value={searchDraft} />
            </div>
          </div>
          <div>
            <Label htmlFor="attendance-status">Status</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" id="attendance-status" onChange={(event) => setFilters((current) => ({ ...current, status: (event.target.value || undefined) as AttendanceOverviewFilters["status"] }))} value={filters.status ?? ""}>
              <option value="">All statuses</option><option value="Present">Present</option><option value="Checked Out">Checked out</option>
            </select>
          </div>
          <div>
            <Label htmlFor="attendance-method">Method</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" id="attendance-method" onChange={(event) => setFilters((current) => ({ ...current, method: (event.target.value || undefined) as AttendanceOverviewFilters["method"] }))} value={filters.method ?? ""}>
              <option value="">All methods</option><option value="face">Face</option><option value="manual">Manual</option>
            </select>
          </div>
          <Button className="self-end" onClick={() => setFilters((current) => ({ ...current, search: searchDraft.trim() || undefined }))} type="button">Apply</Button>
        </div>

        {error && <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
        {loading && !overview ? <p className="py-10 text-center text-sm text-muted-foreground">Loading live attendance...</p> : null}
        {!loading && overview?.records.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No attendance records match these filters.</p> : null}

        {overview?.records.length ? (
          <div className="mt-4 overflow-x-auto border">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Check-in</th><th className="px-3 py-2">Check-out</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Verification</th><th className="px-3 py-2">Enrollment</th><th className="px-3 py-2 text-right">Action</th></tr>
              </thead>
              <tbody>
                {overview.records.map((record) => (
                  <tr className="border-t align-top" key={record.id}>
                    <td className="px-3 py-3"><p className="font-semibold">{record.employee.fullName}</p><p className="mt-0.5 text-xs text-muted-foreground">{record.employee.email}{record.employee.employeeCode ? ` / ${record.employee.employeeCode}` : ""}</p></td>
                    <td className="px-3 py-3">{time(record.checkInAt)}</td>
                    <td className="px-3 py-3">{time(record.checkOutAt)}</td>
                    <td className="px-3 py-3">{record.status}</td>
                    <td className="px-3 py-3"><p className="font-medium">{methodLabel(record.checkInMethod, record.checkInFaceVerified)}</p>{record.checkInManualReason ? <p className="mt-1 max-w-xs text-xs text-muted-foreground">{record.checkInManualReason}</p> : null}</td>
                    <td className="px-3 py-3"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-muted-foreground" />{enrollmentLabel(record.enrollmentStatus)}</span></td>
                    <td className="px-3 py-3 text-right">
                      <Button disabled={record.enrollmentStatus !== "active" || resettingUserId === record.employee.id} onClick={() => { setResetTarget({ id: record.employee.id, fullName: record.employee.fullName }); setResetReason(""); }} size="sm" title="Require re-enrollment and delete the active template" type="button" variant="outline">
                        <UserRoundX className="h-4 w-4" /> Reset
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-4 w-4" />Server-recorded timestamps. Biometric templates and camera frames are never returned by this page.</p>
      </div>
      {resetTarget && (
        <Dialog
          as="form"
          className="max-w-md"
          onClose={() => { if (!resettingUserId) setResetTarget(null); }}
          onSubmit={(event) => { event.preventDefault(); void resetEnrollment(); }}
        >
          <h2 className="text-lg font-bold">Require face re-enrollment</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This deletes {resetTarget.fullName}&apos;s active encrypted template. No attendance record is changed.
          </p>
          <Label className="mt-4 block" htmlFor="face-reset-reason">Audit reason</Label>
          <textarea
            autoFocus
            className="mt-1.5 flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            id="face-reset-reason"
            maxLength={240}
            onChange={(event) => setResetReason(event.target.value)}
            placeholder="Reason for requiring re-enrollment"
            value={resetReason}
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button disabled={Boolean(resettingUserId)} onClick={() => setResetTarget(null)} type="button" variant="outline">Cancel</Button>
            <Button disabled={Boolean(resettingUserId) || resetReason.trim().length < 3} type="submit">
              {resettingUserId ? "Resetting..." : "Delete template and require re-enrollment"}
            </Button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
