import { Camera, CheckCircle2, RefreshCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { refreshSession } from "@shared/auth/auth-service";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { useConfirm } from "@shared/ui/confirm-dialog-context";
import {
  deleteMyFaceEnrollment,
  enrollMyFace,
  fetchMyFaceEnrollment,
  type FaceEnrollmentStatus,
} from "./face-enrollment.api";
import {
  captureValidatedFaceSample,
  loadHumanFaceEngine,
  type ValidatedFaceSample,
} from "./human-face-engine";

export function FaceEnrollmentPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [status, setStatus] = useState<FaceEnrollmentStatus | null>(null);
  const [samples, setSamples] = useState<ValidatedFaceSample[]>([]);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureInFlightRef = useRef(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    fetchMyFaceEnrollment().then(setStatus).catch((error: Error) => setMessage(error.message));
    return () => stopCamera();
  }, [stopCamera]);

  const startEnrollment = async () => {
    if (!consentAccepted) {
      setMessage("Accept the biometric notice before starting enrollment.");
      return;
    }
    if (!status?.configured) {
      setMessage(status?.unavailableReason ?? "Face enrollment is not configured.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not supported on this device.");
      return;
    }
    setMessage("Loading the local face engine...");
    setCameraError(null);
    setSamples([]);
    try {
      await loadHumanFaceEngine();
      setEngineReady(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setEnrolling(true);
      setMessage("Camera ready. Capture five clear samples one at a time.");
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      }, 0);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setCameraError(
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "Camera permission was denied. Allow camera access and try again."
          : "The camera or local face engine is unavailable. Check the camera and installed model files.",
      );
    }
  };

  const capture = async () => {
    if (captureInFlightRef.current || samples.length >= 5) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setMessage("Camera is still loading. Please try again.");
      return;
    }
    captureInFlightRef.current = true;
    setCapturing(true);
    setMessage(null);
    try {
      const sample = await captureValidatedFaceSample(video, canvas);
      setSamples((current) => [...current, sample].slice(0, 5));
      setMessage("Validated sample accepted. Change your expression slightly while keeping your face centered.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to validate this face sample.");
    } finally {
      captureInFlightRef.current = false;
      setCapturing(false);
    }
  };

  const submit = async () => {
    if (samples.length !== 5 || !consentAccepted) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const nextStatus = await enrollMyFace(
        samples.map((sample) => ({ embedding: sample.embedding, quality: sample.quality })),
        consentAccepted,
      );
      setStatus(nextStatus);
      setSamples([]);
      setEnrolling(false);
      stopCamera();
      await refreshSession();
      setMessage("Face enrollment is active. Raw camera frames were not retained.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Face enrollment failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const removeEnrollment = async () => {
    const approved = await confirm({
      title: "Delete face enrollment?",
      description: "The encrypted biometric template will be removed. Face attendance will be unavailable until you enroll again.",
      confirmLabel: "Delete face data",
      tone: "danger",
    });
    if (!approved) return;
    setSubmitting(true);
    try {
      setStatus(await deleteMyFaceEnrollment("Deleted by employee through Face Setup"));
      await refreshSession();
      setMessage("Face enrollment deleted. The encrypted biometric template was removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Face enrollment could not be deleted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h1 className="mt-3 text-2xl font-bold">Face setup</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Face verification is used only for your own attendance. It does not search for you among other employees.
          </p>
        </div>

        <Card className="p-5">
          {!status ? (
            <p className="text-sm text-muted-foreground">Loading enrollment status...</p>
          ) : !status.configured ? (
            <div className="space-y-3">
              <p className="font-semibold">Face attendance is not configured</p>
              <p className="text-sm text-muted-foreground">{status.unavailableReason}</p>
              <Button onClick={() => navigate("/dashboard")} type="button" variant="outline">Return to dashboard</Button>
            </div>
          ) : status.enrolled && !enrolling ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-semibold">Face enrollment is active</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {status.enrolledAt ? `Enrolled ${new Date(status.enrolledAt).toLocaleString()}.` : "Your encrypted template is ready."}
                  </p>
                </div>
              </div>
              {message && <p className="rounded-md border bg-muted px-3 py-2 text-sm">{message}</p>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigate("/dashboard")} type="button">Continue</Button>
                <Button onClick={() => { setConsentAccepted(false); setEnrolling(true); setMessage(null); }} type="button" variant="outline">
                  <RefreshCcw className="h-4 w-4" /> Replace enrollment
                </Button>
                <Button disabled={submitting} onClick={() => void removeEnrollment()} type="button" variant="outline">
                  <Trash2 className="h-4 w-4" /> Delete face data
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!streamRef.current ? (
                <div className="space-y-4">
                  <div className="rounded-md border bg-muted/50 p-4 text-sm leading-6">
                    <p className="font-semibold">Biometric notice</p>
                    <p className="mt-1 text-muted-foreground">
                      Five camera samples are converted locally into numeric face descriptors. Raw photos are not retained or sent to the server. The combined descriptor is encrypted on the backend. Camera access occurs only while this screen is open and after you start enrollment.
                    </p>
                  </div>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      checked={consentAccepted}
                      className="mt-1 h-4 w-4"
                      onChange={(event) => setConsentAccepted(event.target.checked)}
                      type="checkbox"
                    />
                    <span>I consent to creating and storing an encrypted biometric face template for my attendance verification.</span>
                  </label>
                  {message && <p className="rounded-md border bg-muted px-3 py-2 text-sm">{message}</p>}
                  {cameraError && <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{cameraError}</p>}
                  <div className="flex gap-2">
                    <Button disabled={!consentAccepted} onClick={() => void startEnrollment()} type="button">
                      <Camera className="h-4 w-4" /> Start enrollment
                    </Button>
                    <Button onClick={() => { setEnrolling(false); setConsentAccepted(false); }} type="button" variant="outline">Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-lg border bg-muted">
                    <video ref={videoRef} autoPlay className="h-full w-full scale-x-[-1] object-contain" muted playsInline />
                  </div>
                  <canvas className="hidden" ref={canvasRef} />
                  <div className="grid grid-cols-5 gap-2" aria-label={`${samples.length} of 5 samples captured`}>
                    {[0, 1, 2, 3, 4].map((index) => (
                      <span className={index < samples.length ? "h-2 rounded-sm bg-emerald-600" : "h-2 rounded-sm bg-muted"} key={index} />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{samples.length}/5 validated samples</p>
                    <Button disabled={!engineReady || capturing || submitting || samples.length >= 5} onClick={() => void capture()} type="button" variant="outline">
                      <Camera className="h-4 w-4" /> {capturing ? "Validating..." : "Capture sample"}
                    </Button>
                  </div>
                  {message && <p className="rounded-md border bg-muted px-3 py-2 text-sm">{message}</p>}
                  <div className="flex gap-2">
                    <Button disabled={samples.length !== 5 || submitting} onClick={() => void submit()} type="button">
                      {submitting ? "Securing template..." : "Complete enrollment"}
                    </Button>
                    <Button onClick={() => { stopCamera(); setSamples([]); setEnrolling(false); }} type="button" variant="outline">Cancel</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
