import { Camera, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { refreshSession } from "@shared/auth/auth-service";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { fetchMyFaceEnrollment, enrollMyFace, type FaceEnrollmentStatus } from "./face-enrollment.api";
import {
  captureValidatedFaceSample,
  getHumanFaceEngineVersion,
  loadHumanFaceEngine,
  type ValidatedFaceSample,
} from "./human-face-engine";

export function FaceEnrollmentPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<FaceEnrollmentStatus | null>(null);
  const [samples, setSamples] = useState<ValidatedFaceSample[]>([]);
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

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not supported on this device.");
      return;
    }
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setCameraError(
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "Camera permission was denied. Allow camera access to enroll your face."
          : "Camera is unavailable. Connect or enable a webcam and try again.",
      );
    }
  }, []);

  useEffect(() => {
    fetchMyFaceEnrollment()
      .then(setStatus)
      .catch((error: Error) => setMessage(error.message));
    setEngineReady(false);
    loadHumanFaceEngine()
      .then(() => setEngineReady(true))
      .catch(() => setMessage("Face engine could not be loaded. Reinstall the Employee app and try again."));
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const capture = async () => {
    if (captureInFlightRef.current) {
      return;
    }

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
      setMessage(`Valid live face sample captured. Anti-spoof ${Math.round(sample.quality.real * 100)}%, liveness ${Math.round(sample.quality.live * 100)}%.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to validate this face sample.");
    } finally {
      captureInFlightRef.current = false;
      setCapturing(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const nextStatus = await enrollMyFace(samples.map((sample) => sample.image));
      setStatus(nextStatus);
      await refreshSession();
      stopCamera();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-2xl font-bold">Face enrollment</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            AI BOS uses face verification only for attendance identity checks. Biometric templates stay server-side and are not shown in the app.
          </p>
        </div>

        <Card className="p-6">
          {status?.enrolled ? (
            <div className="space-y-4 text-center">
              <p className="text-sm font-semibold">Face enrollment is active.</p>
              <Button onClick={() => navigate("/dashboard", { replace: true })} type="button">
                Continue
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-lg border bg-muted">
                <video ref={videoRef} autoPlay className="h-full w-full scale-x-[-1] object-contain" muted playsInline />
              </div>
              <canvas className="hidden" ref={canvasRef} />
              {cameraError && <p className="rounded-lg border bg-muted px-3 py-2 text-sm text-destructive">{cameraError}</p>}
              {message && <p className="rounded-lg border bg-muted px-3 py-2 text-sm">{message}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{samples.length}/3 required samples</p>
                  <p className="mt-1 text-xs text-muted-foreground">{getHumanFaceEngineVersion()}</p>
                </div>
                <Button disabled={Boolean(cameraError) || !engineReady || capturing || submitting} onClick={() => void capture()} type="button" variant="outline">
                  <Camera className="h-4 w-4" />
                  {capturing ? "Validating..." : engineReady ? "Capture sample" : "Loading face engine..."}
                </Button>
              </div>
              <Button className="w-full" disabled={samples.length < 3 || submitting} onClick={() => void submit()} type="button">
                {submitting ? "Enrolling..." : "Enroll face"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
