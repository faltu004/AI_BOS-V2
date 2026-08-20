import { motion } from "framer-motion";
import { Calendar, Camera, CalendarCheck, CheckCircle2, ClipboardCheck, History, LocateFixed, MapPin, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import { formatClockTime } from "@shared/lib/utils-helpers";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import {
 applyForLeave,
 cancelLeaveRequest,
 decideLeaveRequest,
 fetchLeaveApprovals,
 fetchMyLeaveRequests,
 type LeaveRequestPayload,
 type LeaveRequestRecord,
 type LeaveType,
} from "@shared/leave/leave.api";
import {
 checkInAttendance,
 checkOutAttendance,
 fetchAttendanceHistory,
 fetchTodayAttendance,
 type AttendanceLocationPayload,
 type AttendanceMarkPayload,
 type AttendanceRecord,
 type AttendanceToday,
} from "./attendance.api";

type AttendanceDrawerProps = {
 onClose: () => void;
 open: boolean;
 shiftLabel?: string;
 userFallback?: string;
};

type AttendanceAction = "check-in" | "check-out";
type AttendanceStep = "idle" | "location" | "face" | "done";

const leaveApproverRoles = ["HR", "Manager", "Administrator", "Owner"];

function buildAttendanceMapUrl(
 office: { latitude: number; longitude: number },
 user?: { latitude: number; longitude: number } | null,
) {
 const points = user ? [office, user] : [office];
 const lats = points.map((point) => point.latitude);
 const lngs = points.map((point) => point.longitude);
 const padding = 0.0015;
 const minLat = Math.min(...lats) - padding;
 const maxLat = Math.max(...lats) + padding;
 const minLng = Math.min(...lngs) - padding;
 const maxLng = Math.max(...lngs) + padding;
 const bbox = [minLng, minLat, maxLng, maxLat].map((value) => value.toFixed(6)).join("%2C");
 const marker = user ?? office;
 return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker.latitude.toFixed(6)}%2C${marker.longitude.toFixed(6)}`;
}

function formatTime(value?: string) {
 if (!value) return "Pending";
 return formatClockTime(value);
}

function formatDate(value: string) {
 const parsed = new Date(`${value}T00:00:00`);
 if (Number.isNaN(parsed.getTime())) return value;
 return parsed.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatCoordinate(value?: number) {
 if (typeof value !== "number" || !Number.isFinite(value)) return "-";
 return value.toFixed(6);
}

function getLocation(): Promise<AttendanceLocationPayload> {
 if (!navigator.geolocation) {
 return Promise.reject(new Error("Location is not supported on this device."));
 }

 return new Promise((resolve, reject) => {
 navigator.geolocation.getCurrentPosition(
 (position) =>
 resolve({
 latitude: position.coords.latitude,
 longitude: position.coords.longitude,
 accuracy: position.coords.accuracy,
 }),
 (error) => {
 if (error.code === error.PERMISSION_DENIED) {
 reject(new Error("Please allow location permission to mark attendance."));
 return;
 }
 reject(new Error("Could not detect your location. Please try again."));
 },
 { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
 );
 });
}

function locationText(record?: AttendanceRecord | null) {
 const location = record?.checkOutLocation ?? record?.checkInLocation;
 if (!location?.distanceMeters && location?.distanceMeters !== 0) return "Location pending";
 const accuracy = location.accuracy ? `, GPS accuracy ${Math.round(location.accuracy)}m` : "";
 return `${Math.round(location.distanceMeters)}m from office${accuracy}`;
}

export function AttendanceDrawer({
 onClose,
 open,
 shiftLabel = "09:30 to 18:30 IST",
 userFallback = "Team member",
}: AttendanceDrawerProps) {
 const session = getStoredAuthSession();
 const [view, setView] = useState<"today" | "history" | "leave" | "approvals">("today");
 const [today, setToday] = useState<AttendanceToday | null>(null);
 const [history, setHistory] = useState<AttendanceRecord[]>([]);
 const [historyLoading, setHistoryLoading] = useState(false);
 const [historyLoaded, setHistoryLoaded] = useState(false);
 const [historyError, setHistoryError] = useState<string | null>(null);
 const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>([]);
 const [leaveLoading, setLeaveLoading] = useState(false);
 const [leaveLoaded, setLeaveLoaded] = useState(false);
 const [leaveError, setLeaveError] = useState<string | null>(null);
 const [leaveSubmitting, setLeaveSubmitting] = useState(false);
 const [leaveMessage, setLeaveMessage] = useState<string | null>(null);
 const [leaveForm, setLeaveForm] = useState<LeaveRequestPayload>({
 type: "Paid Leave",
 from: new Date().toISOString().slice(0, 10),
 to: new Date().toISOString().slice(0, 10),
 reason: "",
 });
 const [approvals, setApprovals] = useState<LeaveRequestRecord[]>([]);
 const [approvalsLoading, setApprovalsLoading] = useState(false);
 const [approvalsLoaded, setApprovalsLoaded] = useState(false);
 const [approvalsError, setApprovalsError] = useState<string | null>(null);
 const [decidingId, setDecidingId] = useState<string | null>(null);
 const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
 const [loading, setLoading] = useState(false);
 const [action, setAction] = useState<AttendanceAction | null>(null);
 const [step, setStep] = useState<AttendanceStep>("idle");
 const [message, setMessage] = useState<string | null>(null);
 const [pendingLocation, setPendingLocation] = useState<AttendanceLocationPayload | null>(null);
 const [faceImage, setFaceImage] = useState<string | null>(null);
 const [cameraReady, setCameraReady] = useState(false);
 const [cameraError, setCameraError] = useState<string | null>(null);
 const videoRef = useRef<HTMLVideoElement | null>(null);
 const canvasRef = useRef<HTMLCanvasElement | null>(null);
 const streamRef = useRef<MediaStream | null>(null);
 const displayDate = useMemo(
 () => new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
 [],
 );
 const name = session?.user.fullName ?? session?.user.role ?? userFallback;
 const canApproveLeave = Boolean(session?.user.role && leaveApproverRoles.includes(session.user.role));
 const record = today?.record ?? null;
 const office = today?.office ?? { name: "Office", latitude: 12.9716, longitude: 77.5946, radiusMeters: 300 };
 const markedLocation = record?.checkOutLocation ?? record?.checkInLocation;
 const locationMapUrl = useMemo(
 () => buildAttendanceMapUrl(office, pendingLocation),
 [office, pendingLocation],
 );
 const completed = Boolean(record?.checkOutAt);
 const checkedIn = Boolean(record?.checkInAt);
 const isFaceStep = step === "face";
 const primaryAction: AttendanceAction | null = completed ? null : checkedIn ? "check-out" : "check-in";
 const primaryLabel = primaryAction === "check-out" ? "Check Out" : "Check In";
 const pendingApprovalsCount = approvals.filter((item) => item.status === "Pending").length;

 const stopCamera = useCallback(() => {
 streamRef.current?.getTracks().forEach((track) => track.stop());
 streamRef.current = null;
 setCameraReady(false);
 }, []);

 const loadToday = useCallback(async () => {
 setLoading(true);
 setMessage(null);
 try {
 setToday(await fetchTodayAttendance());
 } catch (error) {
 setMessage(error instanceof Error ? error.message : "Could not load attendance.");
 } finally {
 setLoading(false);
 }
 }, []);

 const loadHistory = useCallback(async () => {
 setHistoryLoading(true);
 setHistoryError(null);
 try {
 setHistory(await fetchAttendanceHistory());
 setHistoryLoaded(true);
 } catch (error) {
 setHistoryError(error instanceof Error ? error.message : "Could not load attendance history.");
 } finally {
 setHistoryLoading(false);
 }
 }, []);

 const loadLeaveRequests = useCallback(async () => {
 setLeaveLoading(true);
 setLeaveError(null);
 try {
 setLeaveRequests(await fetchMyLeaveRequests());
 setLeaveLoaded(true);
 } catch (error) {
 setLeaveError(error instanceof Error ? error.message : "Could not load leave requests.");
 } finally {
 setLeaveLoading(false);
 }
 }, []);

 const loadApprovals = useCallback(async () => {
 setApprovalsLoading(true);
 setApprovalsError(null);
 try {
 setApprovals(await fetchLeaveApprovals());
 setApprovalsLoaded(true);
 } catch (error) {
 setApprovalsError(error instanceof Error ? error.message : "Could not load leave approvals.");
 } finally {
 setApprovalsLoading(false);
 }
 }, []);

 useEffect(() => {
 if (open) void loadToday();
 }, [loadToday, open]);

 useEffect(() => {
 if (open && view === "history" && !historyLoaded) void loadHistory();
 }, [historyLoaded, loadHistory, open, view]);

 useEffect(() => {
 if (open && view === "leave" && !leaveLoaded) void loadLeaveRequests();
 }, [leaveLoaded, loadLeaveRequests, open, view]);

 useEffect(() => {
 if (open && canApproveLeave && !approvalsLoaded) void loadApprovals();
 }, [approvalsLoaded, canApproveLeave, loadApprovals, open]);

 const startCamera = useCallback(async () => {
 if (!navigator.mediaDevices?.getUserMedia) {
 setCameraError("Camera is not supported on this device.");
 return;
 }
 setCameraError(null);
 setCameraReady(false);
 try {
 const stream = await navigator.mediaDevices.getUserMedia({
 audio: false,
 video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } },
 });
 streamRef.current = stream;
 setCameraReady(true);
 if (videoRef.current) {
 videoRef.current.srcObject = stream;
 await videoRef.current.play().catch(() => undefined);
 }
 } catch {
 setCameraError("Please allow camera permission to capture face proof.");
 setCameraReady(false);
 }
 }, []);

 useEffect(() => {
 if (step !== "face" || faceImage) return;
 void startCamera();
 }, [faceImage, startCamera, step]);

 useEffect(() => {
 if (videoRef.current && streamRef.current) {
 videoRef.current.srcObject = streamRef.current;
 void videoRef.current.play().catch(() => undefined);
 }
 }, [cameraReady]);

 useEffect(() => {
 if (!open) {
 stopCamera();
 setAction(null);
 setStep("idle");
 setPendingLocation(null);
 setFaceImage(null);
 setMessage(null);
 setCameraError(null);
 setView("today");
 setLeaveMessage(null);
 setDecidingId(null);
 }
 }, [open, stopCamera]);

 useEffect(() => () => stopCamera(), [stopCamera]);

 const beginMark = async (nextAction: AttendanceAction) => {
 setAction(nextAction);
 setStep("location");
 setPendingLocation(null);
 setFaceImage(null);
 setMessage(nextAction === "check-in" ? "Detecting office location..." : "Verifying office location...");
 try {
 const location = await getLocation();
 setPendingLocation(location);
 setMessage("Location detected. Tap Next to capture face proof.");
 } catch (error) {
 setMessage(error instanceof Error ? error.message : "Location could not be verified.");
 setStep("idle");
 setAction(null);
 }
 };

 const continueToFace = () => {
 if (!pendingLocation) return;
 setStep("face");
 setMessage("Capture face proof to continue.");
 };

 const captureFace = () => {
 const video = videoRef.current;
 const canvas = canvasRef.current;
 if (!video || !canvas) return;
 if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
 setMessage("Camera is still loading. Please try again in a moment.");
 return;
 }

 canvas.width = 320;
 canvas.height = 320;
 const context = canvas.getContext("2d");
 if (!context) return;
 context.fillStyle = "#000";
 context.fillRect(0, 0, canvas.width, canvas.height);
 const sourceWidth = video.videoWidth || 480;
 const sourceHeight = video.videoHeight || 480;
 const scale = Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
 const drawWidth = sourceWidth * scale;
 const drawHeight = sourceHeight * scale;
 const drawX = (canvas.width - drawWidth) / 2;
 const drawY = (canvas.height - drawHeight) / 2;
 context.save();
 context.translate(canvas.width, 0);
 context.scale(-1, 1);
 context.drawImage(video, canvas.width - drawX - drawWidth, drawY, drawWidth, drawHeight);
 context.restore();
    const capturedImage = canvas.toDataURL("image/png");
    if (!capturedImage.startsWith("data:image/png;base64,") || capturedImage.length > 4_000_000) {
 setMessage("Face photo could not be accepted. Please retake it.");
 return;
 }
 setFaceImage(capturedImage);
 stopCamera();
 setMessage("Face captured. Complete attendance to save.");
 };

 const submitAttendance = async () => {
 if (!action || !pendingLocation || !faceImage) return;
 const payload: AttendanceMarkPayload = { ...pendingLocation, faceImage };
 setLoading(true);
 setMessage(action === "check-in" ? "Saving check-in..." : "Saving check-out...");
 try {
 const updated = action === "check-in" ? await checkInAttendance(payload) : await checkOutAttendance(payload);
 setToday((current) => ({
 office: current?.office ?? { name: "Office", latitude: 12.9716, longitude: 77.5946, radiusMeters: 300 },
 record: updated,
 }));
 setStep("done");
 setMessage(action === "check-in" ? "Check-in marked successfully." : "Check-out marked successfully.");
 setAction(null);
 } catch (error) {
 setMessage(error instanceof Error ? error.message : "Attendance could not be marked.");
 setStep("face");
 } finally {
 setLoading(false);
 }
 };

 const resetFlow = () => {
 stopCamera();
 setAction(null);
 setStep("idle");
 setPendingLocation(null);
 setFaceImage(null);
 setCameraError(null);
 setMessage(null);
 };

 const submitLeaveRequest = async () => {
 if (!leaveForm.reason.trim()) {
 setLeaveMessage("Please add a reason for your leave.");
 return;
 }
 if (leaveForm.to < leaveForm.from) {
 setLeaveMessage("End date must be on or after the start date.");
 return;
 }
 setLeaveSubmitting(true);
 setLeaveMessage(null);
 try {
 await applyForLeave(leaveForm);
 setLeaveForm((current) => ({ ...current, reason: "" }));
 setLeaveMessage("Leave request sent to your approver.");
 setLeaveLoaded(false);
 void loadLeaveRequests();
 } catch (error) {
 setLeaveMessage(error instanceof Error ? error.message : "Could not submit leave request.");
 } finally {
 setLeaveSubmitting(false);
 }
 };

 const withdrawLeaveRequest = async (id: string) => {
 setLeaveSubmitting(true);
 setLeaveMessage(null);
 try {
 await cancelLeaveRequest(id);
 setLeaveLoaded(false);
 void loadLeaveRequests();
 } catch (error) {
 setLeaveMessage(error instanceof Error ? error.message : "Could not cancel leave request.");
 } finally {
 setLeaveSubmitting(false);
 }
 };

 const decideRequest = async (id: string, status: "Approved" | "Rejected") => {
 setDecidingId(id);
 setApprovalsError(null);
 try {
 await decideLeaveRequest(id, status, decisionNotes[id]?.trim() || undefined);
 setDecisionNotes((current) => {
 const next = { ...current };
 delete next[id];
 return next;
 });
 setApprovalsLoaded(false);
 void loadApprovals();
 } catch (error) {
 setApprovalsError(error instanceof Error ? error.message : "Could not update this leave request.");
 } finally {
 setDecidingId(null);
 }
 };

 if (!open) return null;

 return (
 <div className="fixed inset-0 z-[90] bg-foreground/35 p-3 backdrop-blur-sm" onClick={onClose}>
 <motion.aside
 animate={{ opacity: 1, x: 0 }}
 className="ml-0 flex h-full w-full max-w-xl flex-col overflow-hidden rounded-lg border bg-background shadow-2xl md:ml-[96px]"
 initial={{ opacity: 0, x: -18 }}
 onClick={(event) => event.stopPropagation()}
 >
 <div className="flex shrink-0 items-start justify-between gap-3 border-b p-3">
 <div>
 <p className="text-xs font-semibold uppercase text-muted-foreground">Attendance</p>
 <h2 className="mt-1 text-xl font-bold">
 {view === "history"
 ? "My Records"
 : view === "leave"
 ? "Apply for Leave"
 : view === "approvals"
 ? "Approvals"
 : "Today"}
 </h2>
 </div>
 <Button aria-label="Close attendance" onClick={onClose} size="icon" type="button" variant="ghost">
 <X className="h-4 w-4" />
 </Button>
 </div>

 {step === "idle" && (
 <div className="flex shrink-0 gap-1 overflow-x-auto border-b bg-muted/40 p-1.5">
 {(
 [
 { key: "today", label: "Today", icon: CalendarCheck },
 { key: "leave", label: "Apply for Leave", icon: Calendar },
 { key: "history", label: "My Records", icon: History },
 ...(canApproveLeave
 ? [{ key: "approvals", label: "Approvals", icon: ClipboardCheck, badge: pendingApprovalsCount } as const]
 : []),
 ] as const
 ).map((tab) => (
 <button
 className={
 view === tab.key
 ? "flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-md bg-background px-2 py-1.5 text-xs font-semibold text-foreground shadow-sm"
 : "flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
 }
 key={tab.key}
 onClick={() => setView(tab.key)}
 type="button"
 >
 <tab.icon className="h-3.5 w-3.5" />
 {tab.label}
 {"badge" in tab && tab.badge > 0 && (
 <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
 {tab.badge}
 </span>
 )}
 </button>
 ))}
 </div>
 )}

 <div className="flex min-h-0 flex-1 flex-col p-3">
 {step !== "idle" && (
 <div className="shrink-0 rounded-lg border bg-card px-3 py-2">
 <div className="grid grid-cols-3 gap-2">
 {[
 { label: "Location", active: step === "location", done: Boolean(pendingLocation) || step === "face" || step === "done" },
 { label: "Face", active: step === "face", done: Boolean(faceImage) || step === "done" },
 { label: "Done", active: step === "done", done: step === "done" },
 ].map((item, index) => (
 <div className="flex min-w-0 items-center gap-2" key={item.label}>
 <span
 className={
 item.done
 ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white"
 : item.active
 ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
 : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background text-[11px] font-bold text-muted-foreground"
 }
 >
 {item.done ? "OK" : index + 1}
 </span>
 <span className="min-w-0">
 <span className={item.done ? "block truncate text-xs font-semibold text-emerald-600 dark:text-emerald-300" : item.active ? "block truncate text-xs font-semibold text-primary" : "block truncate text-xs font-semibold text-muted-foreground"}>
 {item.label}
 </span>
 <span className="block truncate text-[10px] text-muted-foreground">{item.done ? "Done" : item.active ? "Now" : "Pending"}</span>
 </span>
 </div>
 ))}
 </div>
 </div>
 )}

 {step === "idle" && view === "today" && (
 <div className="flex min-h-0 flex-1 flex-col">
 {message && <div className="mt-3 rounded-lg border bg-muted px-3 py-2 text-xs font-medium text-foreground">{message}</div>}
 <div className="mt-3 grid min-h-0 gap-2">
 <div className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
 <div>
 <p className="text-sm font-semibold">{name}</p>
 <p className="mt-1 text-xs text-muted-foreground">{displayDate}</p>
 </div>
 <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
 <CalendarCheck className="h-4 w-4" />
 </span>
 </div>
 <div className="rounded-lg border bg-card p-3">
 <p className="text-xs font-semibold uppercase text-muted-foreground">Shift</p>
 <p className="mt-1 text-sm font-semibold">{shiftLabel}</p>
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div className="rounded-lg border bg-card px-3 py-2 text-sm font-semibold">Check-in: {formatTime(record?.checkInAt)}</div>
 <div className="rounded-lg border bg-card px-3 py-2 text-sm font-semibold">Check-out: {formatTime(record?.checkOutAt)}</div>
 </div>
 <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
 <LocateFixed className="h-3.5 w-3.5" />
 {locationText(record)}
 </div>
 {markedLocation && (
 <div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
 <span className="font-semibold text-foreground">Marked:</span>{" "}
 {formatCoordinate(markedLocation.latitude)}, {formatCoordinate(markedLocation.longitude)}
 </div>
 )}
 </div>
 <div className="mt-auto grid shrink-0 gap-2 pt-3 sm:grid-cols-2">
 {primaryAction ? (
 <Button disabled={loading || action !== null} onClick={() => void beginMark(primaryAction)} type="button">
 {primaryLabel}
 </Button>
 ) : (
 <Button disabled type="button" variant="secondary">
 Completed
 </Button>
 )}
 <Button onClick={onClose} type="button" variant="ghost">
 Cancel
 </Button>
 </div>
 </div>
 )}

 {step === "idle" && view === "history" && (
 <div className="flex min-h-0 flex-1 flex-col">
 <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
 {historyLoading && <p className="px-1 text-xs text-muted-foreground">Loading your attendance records...</p>}
 {!historyLoading && historyError && (
 <div className="rounded-lg border bg-muted px-3 py-2 text-xs font-medium text-destructive">{historyError}</div>
 )}
 {!historyLoading && !historyError && history.length === 0 && (
 <p className="px-1 text-xs text-muted-foreground">No attendance records yet.</p>
 )}
 {!historyLoading &&
 !historyError &&
 history.map((item) => (
 <div className="rounded-lg border bg-card p-3" key={item._id ?? item.id ?? `${item.date}-${item.checkInAt}`}>
 <div className="flex items-center justify-between gap-3">
 <p className="text-sm font-semibold">{formatDate(item.date)}</p>
 <span
 className={
 item.status === "Checked Out"
 ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300"
 : "rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
 }
 >
 {item.status}
 </span>
 </div>
 <div className="mt-2 grid grid-cols-2 gap-2">
 <div className="rounded-lg bg-muted px-3 py-2 text-xs font-semibold">Check-in: {formatTime(item.checkInAt)}</div>
 <div className="rounded-lg bg-muted px-3 py-2 text-xs font-semibold">Check-out: {formatTime(item.checkOutAt)}</div>
 </div>
 </div>
 ))}
 </div>
 <div className="mt-3 grid shrink-0 gap-2 sm:grid-cols-2">
 <Button disabled={historyLoading} onClick={() => void loadHistory()} type="button" variant="outline">
 Refresh
 </Button>
 <Button onClick={onClose} type="button" variant="ghost">
 Close
 </Button>
 </div>
 </div>
 )}

 {step === "idle" && view === "leave" && (
 <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
 <div className="mt-3 space-y-3 rounded-lg border bg-card p-3">
 <div>
 <Label htmlFor="leave-type">Leave type</Label>
 <select
 className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
 id="leave-type"
 onChange={(event) => setLeaveForm((current) => ({ ...current, type: event.target.value as LeaveType }))}
 value={leaveForm.type}
 >
 <option value="Paid Leave">Paid Leave</option>
 <option value="Sick Leave">Sick Leave</option>
 <option value="Casual Leave">Casual Leave</option>
 <option value="Unpaid Leave">Unpaid Leave</option>
 </select>
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <Label htmlFor="leave-from">From</Label>
 <Input
 className="mt-1.5"
 id="leave-from"
 onChange={(event) => setLeaveForm((current) => ({ ...current, from: event.target.value }))}
 type="date"
 value={leaveForm.from}
 />
 </div>
 <div>
 <Label htmlFor="leave-to">To</Label>
 <Input
 className="mt-1.5"
 id="leave-to"
 min={leaveForm.from}
 onChange={(event) => setLeaveForm((current) => ({ ...current, to: event.target.value }))}
 type="date"
 value={leaveForm.to}
 />
 </div>
 </div>
 <div>
 <Label htmlFor="leave-reason">Reason</Label>
 <textarea
 className="mt-1.5 flex min-h-[72px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
 id="leave-reason"
 maxLength={500}
 onChange={(event) => setLeaveForm((current) => ({ ...current, reason: event.target.value }))}
 placeholder="Let your approver know why you're taking leave"
 value={leaveForm.reason}
 />
 </div>
 </div>
 {leaveMessage && (
 <div className="mt-3 rounded-lg border bg-muted px-3 py-2 text-xs font-medium text-foreground">{leaveMessage}</div>
 )}
 <div className="mt-3 shrink-0">
 <Button className="w-full" disabled={leaveSubmitting} onClick={() => void submitLeaveRequest()} type="button">
 {leaveSubmitting ? "Submitting..." : "Submit request"}
 </Button>
 </div>

 <div className="mt-5 flex min-h-0 flex-col gap-2">
 <p className="text-xs font-semibold uppercase text-muted-foreground">Your requests</p>
 {leaveLoading && <p className="px-1 text-xs text-muted-foreground">Loading your leave requests...</p>}
 {!leaveLoading && leaveError && (
 <div className="rounded-lg border bg-muted px-3 py-2 text-xs font-medium text-destructive">{leaveError}</div>
 )}
 {!leaveLoading && !leaveError && leaveRequests.length === 0 && (
 <p className="px-1 text-xs text-muted-foreground">No leave requests yet.</p>
 )}
 {!leaveLoading &&
 !leaveError &&
 leaveRequests.map((item) => {
 const id = item._id ?? item.id ?? `${item.from}-${item.to}`;
 const approver = typeof item.approverId === "object" ? item.approverId?.fullName : undefined;
 return (
 <div className="rounded-lg border bg-card p-3" key={id}>
 <div className="flex items-center justify-between gap-3">
 <p className="text-sm font-semibold">{item.type}</p>
 <span
 className={
 item.status === "Approved"
 ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300"
 : item.status === "Rejected"
 ? "rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive"
 : item.status === "Cancelled"
 ? "rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
 : "rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
 }
 >
 {item.status}
 </span>
 </div>
 <p className="mt-1 text-xs text-muted-foreground">
 {formatDate(item.from)} – {formatDate(item.to)}
 {approver ? ` · Approver: ${approver}` : ""}
 </p>
 <p className="mt-2 text-xs text-foreground">{item.reason}</p>
 {item.decisionNote && (
 <p className="mt-1 text-xs text-muted-foreground">
 <span className="font-semibold text-foreground">Note:</span> {item.decisionNote}
 </p>
 )}
 {item.status === "Pending" && (
 <Button
 className="mt-2"
 disabled={leaveSubmitting}
 onClick={() => void withdrawLeaveRequest(id)}
 size="sm"
 type="button"
 variant="outline"
 >
 Withdraw
 </Button>
 )}
 </div>
 );
 })}
 </div>
 </div>
 )}

 {step === "idle" && view === "approvals" && canApproveLeave && (
 <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
 <p className="mt-3 text-xs text-muted-foreground">Leave requests from people who report to you.</p>
 <div className="mt-3 flex min-h-0 flex-col gap-2">
 {approvalsLoading && <p className="px-1 text-xs text-muted-foreground">Loading approvals...</p>}
 {!approvalsLoading && approvalsError && (
 <div className="rounded-lg border bg-muted px-3 py-2 text-xs font-medium text-destructive">{approvalsError}</div>
 )}
 {!approvalsLoading && !approvalsError && approvals.length === 0 && (
 <p className="px-1 text-xs text-muted-foreground">No leave requests to review.</p>
 )}
 {!approvalsLoading &&
 !approvalsError &&
 approvals.map((item) => {
 const id = item._id ?? item.id ?? `${item.userId}-${item.from}`;
 const requester = typeof item.userId === "object" ? item.userId?.fullName : undefined;
 const isDeciding = decidingId === id;
 return (
 <div className="rounded-lg border bg-card p-3" key={id}>
 <div className="flex items-center justify-between gap-3">
 <div>
 <p className="text-sm font-semibold">{requester ?? "Team member"}</p>
 <p className="text-xs text-muted-foreground">{item.type}</p>
 </div>
 <span
 className={
 item.status === "Approved"
 ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300"
 : item.status === "Rejected"
 ? "rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive"
 : item.status === "Cancelled"
 ? "rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
 : "rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
 }
 >
 {item.status}
 </span>
 </div>
 <p className="mt-1 text-xs text-muted-foreground">
 {formatDate(item.from)} – {formatDate(item.to)}
 </p>
 <p className="mt-2 text-xs text-foreground">{item.reason}</p>
 {item.decisionNote && (
 <p className="mt-1 text-xs text-muted-foreground">
 <span className="font-semibold text-foreground">Note:</span> {item.decisionNote}
 </p>
 )}
 {item.status === "Pending" && (
 <div className="mt-2.5 space-y-2">
 <textarea
 className="flex min-h-[52px] w-full rounded-lg border border-input bg-background px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
 maxLength={500}
 onChange={(event) =>
 setDecisionNotes((current) => ({ ...current, [id]: event.target.value }))
 }
 placeholder="Optional note (visible to the requester)"
 value={decisionNotes[id] ?? ""}
 />
 <div className="grid grid-cols-2 gap-2">
 <Button
 disabled={isDeciding}
 onClick={() => void decideRequest(id, "Approved")}
 size="sm"
 type="button"
 >
 {isDeciding ? "Saving..." : "Approve"}
 </Button>
 <Button
 disabled={isDeciding}
 onClick={() => void decideRequest(id, "Rejected")}
 size="sm"
 type="button"
 variant="outline"
 >
 {isDeciding ? "Saving..." : "Reject"}
 </Button>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>
 )}

 {step === "location" && (
 <div className="flex min-h-0 flex-1 flex-col">
 <div className="mt-3 rounded-lg border bg-card p-3">
 <div className="flex items-center justify-between gap-3">
 <div>
 <p className="text-xs font-semibold uppercase text-muted-foreground">Location Verification</p>
 <p className="mt-1 text-sm font-semibold">{pendingLocation ? "Location detected" : "Detecting location..."}</p>
 </div>
 <MapPin className="h-4 w-4 text-primary" />
 </div>
 <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
 <div className="rounded-lg bg-muted px-3 py-2">
 <span className="font-semibold text-foreground">Office:</span> {office.name ?? "Office"} radius {office.radiusMeters}m
 </div>
 <div className="rounded-lg bg-muted px-3 py-2">
 <span className="font-semibold text-foreground">Office coordinates:</span>{" "}
 {formatCoordinate(office.latitude)}, {formatCoordinate(office.longitude)}
 </div>
 {pendingLocation && (
 <div className="rounded-lg bg-muted px-3 py-2">
 <span className="font-semibold text-foreground">Your coordinates:</span>{" "}
 {formatCoordinate(pendingLocation.latitude)}, {formatCoordinate(pendingLocation.longitude)}
 {pendingLocation.accuracy ? `, accuracy ${Math.round(pendingLocation.accuracy)}m` : ""}
 </div>
 )}
 </div>
 <div className="mt-3 overflow-hidden rounded-lg border bg-muted">
 <iframe
 className="h-40 w-full"
 loading="lazy"
 referrerPolicy="no-referrer-when-downgrade"
 src={locationMapUrl}
 title="Attendance location map preview"
 />
 <div className="border-t bg-background px-3 py-2 text-xs text-muted-foreground">
 {pendingLocation ? "Your location on the map" : `${office.name ?? "Office"} · ${office.radiusMeters}m radius`}
 </div>
 </div>
 </div>
 {message && <div className="mt-3 rounded-lg border bg-muted px-3 py-2 text-xs font-medium text-foreground">{message}</div>}
 <div className="mt-auto grid shrink-0 gap-2 pt-3 sm:grid-cols-2">
 <Button disabled={!pendingLocation} onClick={continueToFace} type="button">
 Next
 </Button>
 <Button onClick={resetFlow} type="button" variant="ghost">
 Cancel
 </Button>
 </div>
 </div>
 )}

 {isFaceStep && (
 <div className="flex min-h-0 flex-1 flex-col">
 <div className="mt-3 rounded-lg border bg-card p-3">
 <div className="flex items-center justify-between gap-3">
 <div>
 <p className="text-xs font-semibold uppercase text-muted-foreground">Face Proof</p>
 <p className="mt-1 text-sm font-semibold">{faceImage ? "Captured" : "Camera capture"}</p>
 </div>
 <Camera className="h-4 w-4 text-primary" />
 </div>
 <div className="mx-auto mt-3 aspect-square w-full max-w-[min(20rem,calc(100vh-17rem))] overflow-hidden rounded-lg border bg-muted">
 {faceImage ? (
 <img alt="Captured face proof" className="h-full w-full object-contain" src={faceImage} />
 ) : (
 <video ref={videoRef} autoPlay className="h-full w-full scale-x-[-1] object-contain" muted playsInline />
 )}
 </div>
 <canvas className="hidden" ref={canvasRef} />
 {cameraError && <p className="mt-3 rounded-lg border bg-muted px-3 py-2 text-xs text-destructive">{cameraError}</p>}
 </div>
 {message && <div className="mt-3 rounded-lg border bg-muted px-3 py-2 text-xs font-medium text-foreground">{message}</div>}
 <div className="mt-auto grid shrink-0 gap-2 pt-3 sm:grid-cols-3">
 {!faceImage ? (
 <Button disabled={loading || Boolean(cameraError)} onClick={captureFace} type="button">
 <Camera className="h-4 w-4" />
 Capture Face
 </Button>
 ) : (
 <Button onClick={() => {
 setFaceImage(null);
 setMessage("Retake face proof.");
 void startCamera();
 }} type="button" variant="outline">
 Retake
 </Button>
 )}
 <Button disabled={loading || !faceImage || action === null} onClick={() => void submitAttendance()} type="button">
 <CheckCircle2 className="h-4 w-4" />
 Complete
 </Button>
 <Button onClick={resetFlow} type="button" variant="ghost">
 Cancel
 </Button>
 </div>
 </div>
 )}

 {step === "done" && (
 <div className="flex min-h-0 flex-1 flex-col">
 <div className="mt-3 rounded-lg border bg-card p-3">
 <p className="text-xs font-semibold uppercase text-muted-foreground">Done</p>
 <p className="mt-1 text-sm font-semibold">{message ?? "Attendance updated."}</p>
 </div>
 <div className="mt-auto grid shrink-0 gap-2 pt-3 sm:grid-cols-2">
 <Button onClick={() => void loadToday()} type="button" variant="outline">
 Refresh
 </Button>
 <Button onClick={onClose} type="button">
 Close
 </Button>
 </div>
 </div>
 )}
 </div>
 </motion.aside>
 </div>
 );
}
